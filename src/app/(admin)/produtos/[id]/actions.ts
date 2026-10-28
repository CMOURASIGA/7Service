'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

function readFields(form:FormData) {
  const code=String(form.get('code')??'').trim().toUpperCase();
  const name=String(form.get('name')??'').trim();
  if(!/^[A-Z][A-Z0-9_-]{1,49}$/.test(code)||name.length<2||name.length>120)
    throw new Error('Código (2-50) ou nome (2-120) inválido.');
  return {code,name};
}
async function checkedProduct(productId:string) {
  const {internalUser}=await requirePermission('products.manage');
  const db=createAdminClient();
  const {data,error}=await db.from('products').select('id,status').eq('id',productId).maybeSingle();
  if(error||!data) throw new Error('Produto não encontrado.');
  if(data.status!=='ACTIVE') throw new Error('Produto inativo não admite alterações.');
  return {db,internalUser};
}
async function audit(actorId:string,action:string,targetType:string,targetId:string,productId:string) {
  const {error}=await createAdminClient().from('audit_logs').insert({
    actor_internal_user_id:actorId,action,target_type:targetType,target_id:targetId,
    product_id:productId,source:'7service',
  });
  if(error) throw new Error('Registro criado, mas auditoria falhou.');
}

export async function createProductRoleAction(productId:string,form:FormData) {
  const {db,internalUser}=await checkedProduct(productId);
  const fields=readFields(form);
  const {data,error}=await db.from('product_roles')
    .insert({product_id:productId,...fields,status:'ACTIVE'}).select('id').single();
  if(error||!data) throw new Error(error?.code==='23505'?'Já existe perfil com este código.':'Falha ao cadastrar perfil.');
  await audit(internalUser.id,'product.role_created','product_role',data.id,productId);
  revalidatePath('/produtos/'+productId);
}
export async function createProductModuleAction(productId:string,form:FormData) {
  const {db,internalUser}=await checkedProduct(productId);
  const fields=readFields(form);
  const {data,error}=await db.from('product_modules')
    .insert({product_id:productId,...fields,status:'ACTIVE'}).select('id').single();
  if(error||!data) throw new Error(error?.code==='23505'?'Já existe módulo com este código.':'Falha ao cadastrar módulo.');
  await audit(internalUser.id,'product.module_created','product_module',data.id,productId);
  revalidatePath('/produtos/'+productId);
}
export async function createProductFeatureAction(productId:string,form:FormData) {
  const {db,internalUser}=await checkedProduct(productId);
  const fields=readFields(form);
  const moduleId=String(form.get('moduleId')??'').trim();
  if(moduleId) {
    const {data,error}=await db.from('product_modules')
      .select('id').eq('id',moduleId).eq('product_id',productId).maybeSingle();
    if(error||!data) throw new Error('Módulo não pertence ao produto.');
  }
  const {data,error}=await db.from('product_features')
    .insert({product_id:productId,module_id:moduleId||null,...fields,status:'ACTIVE'})
    .select('id').single();
  if(error||!data) throw new Error(error?.code==='23505'?'Já existe feature com este código.':'Falha ao cadastrar feature.');
  await audit(internalUser.id,'product.feature_created','product_feature',data.id,productId);
  revalidatePath('/produtos/'+productId);
}
