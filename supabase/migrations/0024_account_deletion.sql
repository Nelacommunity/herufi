-- Account deletion (Tanzania Personal Data Protection Act, 2022: right to erasure).
--
-- When a customer deletes their account, deleting the auth user cascades to their profile,
-- addresses, cart, wishlist, browsing history, notifications, check-ins and push tokens.
-- Orders, reviews and questions are kept but unlinked (ON DELETE SET NULL). Orders are needed for
-- tax and accounting, so this function first strips the personal details from them: the amounts,
-- items and town stay, the name, phone, street, map pin and email go. Called by the app with the
-- service role, right before it deletes the auth user.

create or replace function public.prepare_account_deletion(p_user uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from profiles where user_id = p_user;

  -- Paid orders still on their way need the address and phone to be delivered. Guest orders
  -- placed with the same (verified) email belong to the same person, so they count too.
  if exists (select 1 from orders where (user_id = p_user or (v_email is not null and lower(email) = lower(v_email)))
             and payment_status = 'paid' and status in ('confirmed', 'processing', 'shipped')) then
    raise exception 'ACTIVE_ORDERS';
  end if;

  update orders set
    email = 'deleted+' || lower(order_number) || '@deleted.invalid',
    shipping_address = jsonb_build_object(
      'full_name', 'Deleted customer',
      'line1', '',
      'city', coalesce(shipping_address->>'city', ''),
      'region', coalesce(shipping_address->>'region', ''),
      'country', coalesce(shipping_address->>'country', 'TZ'),
      'phone', ''
    )
  where user_id = p_user or (v_email is not null and lower(email) = lower(v_email));

  -- Published content stays (it's useful to other shoppers) but no longer names the person.
  update reviews set author_name = 'Customer' where user_id = p_user;
  update product_questions set author_name = 'Customer' where user_id = p_user;

  if v_email is not null then
    delete from newsletter_subscribers where lower(email) = lower(v_email);
  end if;
  return 'ok';
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
