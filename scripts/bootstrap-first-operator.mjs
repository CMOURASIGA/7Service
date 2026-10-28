/**
 * One-time, server-side operator bootstrap. Never run in a browser or CI.
 * Required environment variables:
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_EMAIL.
 * Requires a fresh central database with no internal users.
 */
import { createClient } from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const email=(process.env.BOOTSTRAP_ADMIN_EMAIL??'').trim().toLowerCase();
if(!url||!key||!/^\S+@\S+\.\S+$/.test(email)){
  throw new Error('Set Supabase server URL, service-role key and admin email.');
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:operators,error:lookupError}=await db.from('internal_users').select('id').limit(1);
if(lookupError) throw lookupError;
if(operators?.length) throw new Error('Bootstrap is only allowed before the first operator exists.');
const {data:role,error:roleError}=await db.from('internal_roles').select('id').eq('code','SUPER_ADMIN').single();
if(roleError||!role) throw new Error('SUPER_ADMIN role is missing.');
const {data:invite,error:inviteError}=await db.auth.admin.inviteUserByEmail(email);
if(inviteError||!invite.user) throw new Error('Could not send initial Auth invitation.');
const {data:operator,error:createError}=await db.from('internal_users').insert({
  auth_user_id:invite.user.id,
  first_name:'Administrador',
  last_name:'Consult Services',
  email,status:'BLOCKED',
}).select('id').single();
if(createError||!operator) throw new Error('Invite issued, but operator persistence failed. Reconcile manually before retry.');
const {error:assignError}=await db.from('internal_user_roles').insert({
  internal_user_id:operator.id,role_id:role.id,
});
if(assignError) throw new Error('Operator remains BLOCKED: role assignment failed.');
const {error:auditError}=await db.from('audit_logs').insert({
  actor_internal_user_id:operator.id,action:'internal.bootstrap',
  target_type:'internal_user',target_id:operator.id,source:'bootstrap',
});
if(auditError) throw new Error('Operator remains BLOCKED: bootstrap audit failed.');
const {error:activateError}=await db.from('internal_users').update({status:'ACTIVE'}).eq('id',operator.id);
if(activateError) throw new Error('Operator remains BLOCKED: status activation failed.');
console.log('First operator invited and linked to SUPER_ADMIN. Complete Supabase Auth email confirmation.');
