DO $$
DECLARE uid uuid; pid uuid := 'd4907eb0-4655-41b2-9ab7-8e733e0a85ee'; got integer; src text; affected integer;
BEGIN
 SELECT id INTO uid FROM app_auth.users WHERE email_verified=true AND banned=false LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'No validation account'; END IF;
 BEGIN
  UPDATE evaluation_policy SET free_writing=2,free_speaking=3;
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>2 OR src<>'free' THEN RAISE EXCEPTION 'Free allowance mismatch'; END IF;
  INSERT INTO evaluation_plans(id,name,price_bdt,writing_limit,speaking_limit) VALUES(pid,'Validation plan',600,30,5);
  INSERT INTO evaluation_subscriptions(id,user_id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status,starts_at,expires_at) VALUES('db98f1c2-02bb-4b13-a09e-c2fb882db161',uid,pid,'Validation plan',600,30,5,'active',now(),now()+interval '30 days');
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>30 OR src<>'subscription' THEN RAISE EXCEPTION 'Paid allowance mismatch'; END IF;
  SELECT monthly_limit INTO got FROM evaluation_allowance(uid,'speaking_product');
  IF got<>5 THEN RAISE EXCEPTION 'Speaking independence failed'; END IF;
  INSERT INTO evaluation_grants(user_id,product,monthly_limit,expires_at) VALUES(uid,'writing_product',0,now()+interval '1 day') ON CONFLICT(user_id,product) DO UPDATE SET monthly_limit=0,expires_at=now()+interval '1 day';
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>0 OR src<>'override' THEN RAISE EXCEPTION 'Zero override failed'; END IF;
  UPDATE evaluation_grants SET monthly_limit=NULL WHERE user_id=uid AND product='writing_product';
  SELECT monthly_limit INTO got FROM evaluation_allowance(uid,'writing_product');
  IF got IS NOT NULL THEN RAISE EXCEPTION 'Unlimited override failed'; END IF;
  UPDATE evaluation_grants SET expires_at=now()-interval '1 second' WHERE user_id=uid AND product='writing_product';
  UPDATE evaluation_subscriptions SET expires_at=now()-interval '1 second',starts_at=now()-interval '30 days' WHERE user_id=uid AND status='active';
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>2 OR src<>'free' THEN RAISE EXCEPTION 'Expired fallback failed'; END IF;
  -- Finite quota must refuse a third reservation without incrementing usage.
  INSERT INTO evaluation_usage(user_id,product,period,count) VALUES(uid,'writing_product',date_trunc('month',now() AT TIME ZONE 'UTC')::date,2) ON CONFLICT(user_id,product,period) DO UPDATE SET count=2;
  WITH allowance AS (SELECT monthly_limit FROM evaluation_allowance(uid,'writing_product')),
  reserved AS (INSERT INTO evaluation_usage(user_id,product,period,count) SELECT uid,'writing_product',date_trunc('month',now() AT TIME ZONE 'UTC')::date,1 FROM allowance WHERE monthly_limit IS NULL OR monthly_limit>0 ON CONFLICT(user_id,product,period) DO UPDATE SET count=evaluation_usage.count+1 WHERE (SELECT monthly_limit FROM allowance) IS NULL OR evaluation_usage.count<(SELECT monthly_limit FROM allowance) RETURNING count)
  SELECT count(*) INTO affected FROM reserved;
  IF affected<>0 THEN RAISE EXCEPTION 'Exhausted reservation succeeded'; END IF;

  INSERT INTO evaluation_subscriptions(id,user_id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status) VALUES('56f6d40f-3eba-4483-a193-07930f10f46f',uid,pid,'Validation plan',600,30,5,'pending');
  EXECUTE $query$WITH candidate AS (SELECT s.id,s.user_id FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE s.id=$1 AND s.status='pending' AND u.banned=false AND u.email_verified=true FOR UPDATE OF s),closed AS (UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$2 WHERE status='active' AND user_id IN(SELECT user_id FROM candidate) RETURNING id) UPDATE public.evaluation_subscriptions SET status='active',starts_at=now(),expires_at=now()+interval '30 days',updated_at=now(),updated_by=$2 WHERE id IN(SELECT id FROM candidate) AND (SELECT count(*) FROM closed)>=0 RETURNING id$query$ USING '56f6d40f-3eba-4483-a193-07930f10f46f'::uuid,uid;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Approval failed'; END IF;
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>30 OR src<>'subscription' THEN RAISE EXCEPTION 'Approved entitlement failed'; END IF;
  EXECUTE $query$WITH candidate AS (SELECT s.id,s.user_id FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE s.id=$1 AND s.status='pending' AND u.banned=false AND u.email_verified=true FOR UPDATE OF s),closed AS (UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$2 WHERE status='active' AND user_id IN(SELECT user_id FROM candidate) RETURNING id) UPDATE public.evaluation_subscriptions SET status='active',starts_at=now(),expires_at=now()+interval '30 days',updated_at=now(),updated_by=$2 WHERE id IN(SELECT id FROM candidate) AND (SELECT count(*) FROM closed)>=0 RETURNING id$query$ USING '56f6d40f-3eba-4483-a193-07930f10f46f'::uuid,uid;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Repeated approval succeeded'; END IF;
  EXECUTE $query$WITH target AS (SELECT u.id user_id,p.* FROM app_auth.users u CROSS JOIN public.evaluation_plans p WHERE u.email=$1 AND u.banned=false AND u.email_verified=true AND p.id=$2),closed AS (UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$4 WHERE status IN('active','pending') AND user_id IN(SELECT user_id FROM target) RETURNING id) INSERT INTO public.evaluation_subscriptions(id,user_id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status,starts_at,expires_at,updated_by) SELECT $3,user_id,id,name,price_bdt,writing_limit,speaking_limit,'active',now(),now()+interval '30 days',$4 FROM target WHERE (SELECT count(*) FROM closed)>=0 RETURNING id$query$ USING (SELECT email FROM app_auth.users WHERE id=uid),pid,'a02e6a92-d25d-48f7-97d3-cd04c46022c4'::uuid,uid;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Manual assignment failed'; END IF;
  SELECT count(*) INTO affected FROM evaluation_subscriptions WHERE user_id=uid AND status='active';
  IF affected<>1 THEN RAISE EXCEPTION 'Multiple active subscriptions'; END IF;
  UPDATE evaluation_subscriptions SET status='cancelled' WHERE user_id=uid AND status='active';
  SELECT monthly_limit,source INTO got,src FROM evaluation_allowance(uid,'writing_product');
  IF got<>2 OR src<>'free' THEN RAISE EXCEPTION 'Cancellation fallback failed'; END IF;
  RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Rollback validation fixtures';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
 END;
END $$;
