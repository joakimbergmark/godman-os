ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principal(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principal(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principal(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principal(id) ON DELETE CASCADE;
ALTER TABLE public.case_decisions ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principal(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS activities_principal_idx ON public.activities(principal_id);
CREATE INDEX IF NOT EXISTS tasks_principal_idx ON public.tasks(principal_id);
CREATE INDEX IF NOT EXISTS documents_principal_idx ON public.documents(principal_id);
CREATE INDEX IF NOT EXISTS contacts_principal_idx ON public.contacts(principal_id);
CREATE INDEX IF NOT EXISTS case_decisions_principal_idx ON public.case_decisions(principal_id);

CREATE OR REPLACE FUNCTION public.fill_principal_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.principal_id IS NULL THEN
    IF TG_TABLE_NAME <> 'contacts' AND NEW.case_id IS NOT NULL THEN
      SELECT principal_id INTO NEW.principal_id FROM public.cases WHERE id = NEW.case_id AND owner_id = NEW.owner_id;
    END IF;
    IF NEW.principal_id IS NULL AND TG_TABLE_NAME IN ('activities','tasks','documents') AND NEW.accounting_year_id IS NOT NULL THEN
      SELECT principal_id INTO NEW.principal_id FROM public.accounting_years WHERE id = NEW.accounting_year_id AND owner_id = NEW.owner_id;
    END IF;
    IF NEW.principal_id IS NULL THEN
      SELECT id INTO NEW.principal_id FROM public.principal WHERE owner_id = NEW.owner_id ORDER BY created_at LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER fill_principal_activities BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.fill_principal_id();
CREATE TRIGGER fill_principal_tasks BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.fill_principal_id();
CREATE TRIGGER fill_principal_documents BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.fill_principal_id();
CREATE TRIGGER fill_principal_contacts BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fill_principal_id();
CREATE TRIGGER fill_principal_case_decisions BEFORE INSERT ON public.case_decisions FOR EACH ROW EXECUTE FUNCTION public.fill_principal_id();

UPDATE public.activities t SET principal_id = COALESCE(
  (SELECT c.principal_id FROM public.cases c WHERE c.id = t.case_id),
  (SELECT y.principal_id FROM public.accounting_years y WHERE y.id = t.accounting_year_id),
  (SELECT p.id FROM public.principal p WHERE p.owner_id = t.owner_id ORDER BY p.created_at LIMIT 1))
WHERE principal_id IS NULL;
UPDATE public.tasks t SET principal_id = COALESCE(
  (SELECT c.principal_id FROM public.cases c WHERE c.id = t.case_id),
  (SELECT y.principal_id FROM public.accounting_years y WHERE y.id = t.accounting_year_id),
  (SELECT p.id FROM public.principal p WHERE p.owner_id = t.owner_id ORDER BY p.created_at LIMIT 1))
WHERE principal_id IS NULL;
UPDATE public.documents t SET principal_id = COALESCE(
  (SELECT c.principal_id FROM public.cases c WHERE c.id = t.case_id),
  (SELECT y.principal_id FROM public.accounting_years y WHERE y.id = t.accounting_year_id),
  (SELECT p.id FROM public.principal p WHERE p.owner_id = t.owner_id ORDER BY p.created_at LIMIT 1))
WHERE principal_id IS NULL;
UPDATE public.case_decisions t SET principal_id = COALESCE(
  (SELECT c.principal_id FROM public.cases c WHERE c.id = t.case_id),
  (SELECT p.id FROM public.principal p WHERE p.owner_id = t.owner_id ORDER BY p.created_at LIMIT 1))
WHERE principal_id IS NULL;
UPDATE public.contacts t SET principal_id =
  (SELECT p.id FROM public.principal p WHERE p.owner_id = t.owner_id ORDER BY p.created_at LIMIT 1)
WHERE principal_id IS NULL;