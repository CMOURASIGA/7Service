import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { subscriptionInAccessWindow } from '@/lib/integrations/subscription-validity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const denied = () => NextResponse.json({ allowed:false, roleCodes:[] }, {headers:{'Cache-Control':'no-store'}});
/** Machine-only verification after Commander independently resolves both approved mappings.
 * The signed restoration request does NOT authorize an identity by itself.
 */
export async function POST(request:Request) {
  // The same signed channel used for central suspension is reused for the
  // read-only entitlement verification. Do not depend on an unrelated legacy
  // product-machine token that may not be configured on both applications.
  const secret=process.env.SERVICE_COMMANDER_REVOCATION_SECRET;
  const stamp=request.headers.get('x-7service-timestamp') ?? '';
  const sig=request.headers.get('x-7service-signature') ?? '';
  if(!secret || secret.length<32 || !/^\\d{13}$/.test(stamp) ||
     Math.abs(Date.now()-Number(stamp))>60000 || !/^[a-f0-9]{64}$/i.test(sig))
    return NextResponse.json({error:'Unauthorized'},{status:401});
  const raw=await request.text();
  if(raw.length>1000)return NextResponse.json({error:'Payload too large'},{status:400});
  const expected=createHmac('sha256',secret).update(stamp+'.'+raw).digest();
  if(!timingSafeEqual(expected,Buffer.from(sig,'hex')))
    return NextResponse.json({error:'Unauthorized'},{status:401});
  let input:unknown;
  try { input=JSON.parse(raw); } catch {return NextResponse.json({error:'Invalid JSON'},{status:400});}
  if (!input || typeof input!=='object')return denied();
  const v=input as Record<string,unknown>;
  if(v.operation!=='CHECK_REGRANT' || v.productCode!=='COMMANDER7' ||
     typeof v.identityId!=='string'||!uuid.test(v.identityId)||
     typeof v.clientId!=='string'||!uuid.test(v.clientId))return denied();
  const db=createAdminClient();
  const [identity,client,membership,product]=await Promise.all([
    db.from('identities').select('status').eq('id',v.identityId).maybeSingle(),
    db.from('clients').select('status').eq('id',v.clientId).maybeSingle(),
    db.from('client_memberships').select('id,status').eq('identity_id',v.identityId)
      .eq('client_id',v.clientId).maybeSingle(),
    db.from('products').select('id,status').eq('code','COMMANDER7').maybeSingle(),
  ]);
  if(identity.error||client.error||membership.error||product.error)
    return NextResponse.json({error:'Authorization unavailable'},{status:503});
  if(identity.data?.status!=='ACTIVE'||client.data?.status!=='ACTIVE'||
     membership.data?.status!=='ACTIVE'||product.data?.status!=='ACTIVE')return denied();
  const subscriptions=await db.from('subscriptions')
    .select('id,status,start_date,end_date,grace_days')
    .eq('client_id',v.clientId).eq('product_id',product.data.id);
  if(subscriptions.error)return NextResponse.json({error:'Authorization unavailable'},{status:503});
  const today=new Date().toISOString().slice(0,10);
  const eligible=(subscriptions.data??[]).filter(s=>subscriptionInAccessWindow({
    status:s.status,startDate:s.start_date,endDate:s.end_date,graceDays:s.grace_days,
  },today));
  if(!eligible.length)return denied();
  const accesses=await db.from('user_product_access')
    .select('product_role_id,valid_from,valid_until')
    .eq('identity_id',v.identityId).eq('client_id',v.clientId)
    .eq('membership_id',membership.data.id).eq('status','ACTIVE')
    .in('subscription_id',eligible.map(s=>s.id));
  if(accesses.error)return NextResponse.json({error:'Authorization unavailable'},{status:503});
  const active=(accesses.data??[]).filter(a=>
    (!a.valid_from||a.valid_from<=today)&&(!a.valid_until||a.valid_until>=today));
  if(!active.length)return denied();
  const roles=await db.from('product_roles').select('id,code').eq('status','ACTIVE')
    .eq('product_id',product.data.id).in('id',active.map(a=>a.product_role_id));
  if(roles.error)return NextResponse.json({error:'Authorization unavailable'},{status:503});
  const codes=[...new Set((roles.data??[]).map(r=>r.code))];
  // Fail closed on mixed roles and do not allow a client to infer other identities.
  return NextResponse.json({allowed:codes.length===1,roleCodes:codes.length===1?codes:[]},
    {headers:{'Cache-Control':'no-store'}});
}
