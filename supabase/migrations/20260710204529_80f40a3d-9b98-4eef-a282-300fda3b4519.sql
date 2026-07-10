
create policy "org_read_product_images" on storage.objects
  for select using (bucket_id = 'product-images' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy "org_upload_product_images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_org_manager_or_above((storage.foldername(name))[1]::uuid));
create policy "org_update_product_images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_org_manager_or_above((storage.foldername(name))[1]::uuid));
create policy "org_delete_product_images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_org_admin_or_above((storage.foldername(name))[1]::uuid));

create policy "org_read_org_logos" on storage.objects
  for select using (bucket_id = 'org-logos' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy "org_upload_org_logos" on storage.objects
  for insert with check (bucket_id = 'org-logos' and public.is_org_admin_or_above((storage.foldername(name))[1]::uuid));
create policy "org_update_org_logos" on storage.objects
  for update using (bucket_id = 'org-logos' and public.is_org_admin_or_above((storage.foldername(name))[1]::uuid));
create policy "org_delete_org_logos" on storage.objects
  for delete using (bucket_id = 'org-logos' and public.is_org_admin_or_above((storage.foldername(name))[1]::uuid));
