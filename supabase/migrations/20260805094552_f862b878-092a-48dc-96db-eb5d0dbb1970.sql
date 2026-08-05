DROP POLICY "own principal" ON public.principal;
CREATE POLICY "own principal" ON public.principal FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "own contacts" ON public.contacts;
CREATE POLICY "own contacts" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "own activities" ON public.activities;
CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "own documents" ON public.documents;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "own tasks" ON public.tasks;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "Owner manages cases" ON public.cases;
CREATE POLICY "Owner manages cases" ON public.cases FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "Owner manages case_decisions" ON public.case_decisions;
CREATE POLICY "Owner manages case_decisions" ON public.case_decisions FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY "Owners manage their obligations" ON public.obligations;
CREATE POLICY "Owners manage their obligations" ON public.obligations FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.principal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligations TO authenticated;

GRANT ALL ON public.principal TO service_role;
GRANT ALL ON public.contacts TO service_role;
GRANT ALL ON public.activities TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.tasks TO service_role;
GRANT ALL ON public.cases TO service_role;
GRANT ALL ON public.case_decisions TO service_role;
GRANT ALL ON public.obligations TO service_role;

REVOKE ALL ON public.principal FROM anon;
REVOKE ALL ON public.contacts FROM anon;
REVOKE ALL ON public.activities FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.tasks FROM anon;
REVOKE ALL ON public.cases FROM anon;
REVOKE ALL ON public.case_decisions FROM anon;
REVOKE ALL ON public.obligations FROM anon;