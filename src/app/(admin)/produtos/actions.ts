'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ProductFormState { error: string | null; success?: boolean; }

export async function createProductAction(_previous: ProductFormState, form: FormData): Promise<ProductFormState> {
  const session = await requirePermission('products.manage');
  const code = String(form.get('code') ?? '').trim().toUpperCase();
  const name = String(form.get('name') ?? '').trim();
  const description = String(form.get('description') ?? '').trim() || null;
  if (!/^[A-Z][A-Z0-9_-]{1,49}$/.test(code) || name.length < 2 || name.length > 150) {
    return {error:'Informe codigo alfanumerico (2-50 caracteres) e nome (2-150 caracteres).'};
  }
  const db = createAdminClient();
  const {data:product,error} = await db.from('products').insert({
    code,name,description,status:'ACTIVE'
  }).select('id').single();
  if(error || !product) return {error: error?.code === '23505' ? 'Ja existe produto com este codigo.' : 'Falha ao cadastrar produto.'};
  const {error:auditError} = await db.from('audit_logs').insert({
    actor_internal_user_id:session.internalUser.id,action:'product.created',
    target_type:'product',target_id:product.id,product_id:product.id,source:'7service',
  });
  if(auditError) return {error:'Produto cadastrado, mas auditoria falhou; solicite conciliacao.'};
  revalidatePath('/produtos');
  return {error:null,success:true};
}
