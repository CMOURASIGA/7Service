import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/config/env';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const noStore={ 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Authorization' };
function deny(reasonCode:string,status=200) {
  return NextResponse.json({version:'1',allowed:false,reasonCode},{status,headers:noStore});
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Customer-side identity is authenticated using the real Supabase Auth JWT.
 * Admin service role is exclusively used server-side AFTER token verification.
 * Only the fixed "product.access" operation is supported: arbitrary permissions
 * are deliberately denied until a product permissions contract is implemented.
 * No caching: administrative revocation takes effect on the next request.
 */
export async function GET(request:Request) {
  const bearer=request.headers.get('authorization')??'';
  if(!/^Bearer [A-Za-z0-9._~-]+$/i.test(bearer)) return deny('AUTH_REQUIRED',401);
  const token=bearer.slice(7);
  const url=new URL(request.url);
  const clientId=url.searchParams.get('clientId')??'';
  const productCode=url.searchParams.get('productCode')??'';
  const action=url.searchParams.get('action')??'product.access';
  const environmentId=url.searchParams.get('environmentId');
  if(!uuid.test(clientId)||!/^[A-Za-z0-9_-]{2,100}$/.test(productCode)||
     (environmentId!==null&&!uuid.test(environmentId))) return deny('INVALID_REQUEST',400);
  if(action!=='product.access') return deny('UNSUPPORTED_ACTION',400);
  try {
    const env=getPublicEnv();
    const auth=createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const {data:verified,error:authError}=await auth.auth.getUser(token);
    if(authError||!verified.user) return deny('INVALID_AUTH',401);
    const db=createAdminClient();
    const {data:identity,error:identityError}=await db.from('identities')
      .select('id,status').eq('auth_user_id',verified.user.id).maybeSingle();
    if(identityError) return deny('BACKEND_ERROR',503);
    if(!identity||identity.status!=='ACTIVE') return deny('IDENTITY_INACTIVE');
    const [client,product,membership]=await Promise.all([
      db.from('clients').select('id,status').eq('id',clientId).maybeSingle(),
      db.from('products').select('id,status').eq('code',productCode).maybeSingle(),
      db.from('client_memberships').select('id,status')
        .eq('identity_id',identity.id).eq('client_id',clientId).maybeSingle(),
    ]);
    if(client.error||product.error||membership.error) return deny('BACKEND_ERROR',503);
    if(client.data?.status!=='ACTIVE') return deny('CLIENT_INACTIVE');
    if(product.data?.status!=='ACTIVE') return deny('PRODUCT_UNAVAILABLE');
    if(membership.data?.status!=='ACTIVE') return deny('MEMBERSHIP_INACTIVE');
    const {data:subscriptions,error:subscriptionsError}=await db.from('subscriptions')
      .select('id,status,start_date,end_date,grace_days')
      .eq('client_id',clientId).eq('product_id',product.data.id);
    if(subscriptionsError) return deny('BACKEND_ERROR',503);
    const today=new Date().toISOString().slice(0,10);
    const activeSubscriptions=(subscriptions??[]).filter(s=>
      s.status==='ACTIVE'&&s.start_date<=today&&
      (!s.end_date || Date.parse(today+'T00:00:00Z')<=Date.parse(s.end_date+'T00:00:00Z')+s.grace_days*86400000)
    );
    if(!activeSubscriptions.length) return deny('SUBSCRIPTION_INACTIVE');
    const {data:accesses,error:accessError}=await db.from('user_product_access')
      .select('id,subscription_id,product_role_id,status,valid_from,valid_until,product_roles(status,code)')
      .eq('identity_id',identity.id).eq('client_id',clientId)
      .eq('membership_id',membership.data.id).eq('status','ACTIVE')
      .in('subscription_id',activeSubscriptions.map(s=>s.id));
    if(accessError) return deny('BACKEND_ERROR',503);
    const authorizedAccesses=(accesses??[]).filter(a=>
      a.product_roles?.status==='ACTIVE'&&a.valid_from<=today&&
      (!a.valid_until||a.valid_until>=today)
    );
    if(!authorizedAccesses.length) return deny('ACCESS_NOT_GRANTED');
    if(environmentId) {
      const {data:envRow,error:envError}=await db.from('product_environments')
        .select('id,status,deployment_id,product_deployments(product_id)')
        .eq('id',environmentId).maybeSingle();
      if(envError) return deny('BACKEND_ERROR',503);
      if(!envRow||envRow.status!=='ACTIVE'||envRow.product_deployments?.product_id!==product.data.id)
        return deny('ENVIRONMENT_UNAVAILABLE');
      const [{data:assignment,error:assignmentError},{data:grants,error:grantsError}]=await Promise.all([
        db.from('client_deployments').select('id')
          .eq('client_id',clientId).eq('deployment_id',envRow.deployment_id).maybeSingle(),
        db.from('environment_access').select('id,access_id,status,valid_until')
          .eq('membership_id',membership.data.id).eq('environment_id',environmentId).eq('status','ACTIVE'),
      ]);
      if(assignmentError||grantsError) return deny('BACKEND_ERROR',503);
      if(!assignment) return deny('ENVIRONMENT_NOT_ASSIGNED');
      const grantedIds=new Set(authorizedAccesses.map(a=>a.id));
      if(!grants?.some(g=>grantedIds.has(g.access_id)&&
        (!g.valid_until||Date.parse(g.valid_until)>Date.now()))) return deny('ENVIRONMENT_ACCESS_DENIED');
    }
    return NextResponse.json({
      version:'1',allowed:true,reasonCode:'ACCESS_GRANTED',clientId,
      productCode,identityId:identity.id,
      roleCodes:[...new Set(authorizedAccesses.map(a=>a.product_roles?.code).filter(Boolean))],
      expiresInSeconds:0,
    },{status:200,headers:noStore});
  }catch {
    return deny('BACKEND_ERROR',503);
  }
}
