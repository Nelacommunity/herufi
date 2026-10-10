-- Bulk delete for super admins only (products, categories, discount codes).
-- Single deletes keep following the per-permission rules from 0009; deleting many records at once is reserved
-- for super admins and checked here, inside the database, so no client can bypass it.
-- Run after 0009_staff_permissions.sql.

create or replace function public.admin_bulk_delete(p_kind text, p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can delete in bulk' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then return 0; end if;
  if cardinality(p_ids) > 500 then raise exception 'Delete at most 500 items at a time'; end if;

  if p_kind = 'products' then
    -- Order lines keep their snapshot (name, price, image); their product_id becomes null.
    delete from products where id = any(p_ids);
  elsif p_kind = 'categories' then
    -- Products in these categories become uncategorised.
    delete from categories where id = any(p_ids);
  elsif p_kind = 'coupons' then
    -- Past orders keep their coupon_code text, so sales history stays readable.
    delete from coupons where id = any(p_ids);
  else
    raise exception 'Unknown kind %', p_kind;
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.admin_bulk_delete(text, uuid[]) from public, anon;
grant execute on function public.admin_bulk_delete(text, uuid[]) to authenticated;
