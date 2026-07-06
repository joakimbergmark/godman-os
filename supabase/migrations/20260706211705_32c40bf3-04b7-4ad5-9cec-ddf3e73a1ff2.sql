
-- 1. accounting_years table
CREATE TABLE public.accounting_years (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  principal_id uuid NOT NULL REFERENCES public.principal(id) ON DELETE CASCADE,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accounting_years_status_check CHECK (status IN ('active','in_progress','submitted','completed','archived')),
  CONSTRAINT accounting_years_year_range CHECK (year BETWEEN 1900 AND 2999),
  CONSTRAINT accounting_years_unique_per_principal UNIQUE (principal_id, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_years TO authenticated;
GRANT ALL ON public.accounting_years TO service_role;

ALTER TABLE public.accounting_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own accounting_years" ON public.accounting_years
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER set_accounting_years_updated_at
  BEFORE UPDATE ON public.accounting_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_accounting_years_owner ON public.accounting_years(owner_id);
CREATE INDEX idx_accounting_years_principal ON public.accounting_years(principal_id);

-- 2. Trigger: auto-create current year when a principal is created
CREATE OR REPLACE FUNCTION public.create_current_accounting_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounting_years (owner_id, principal_id, year, status)
  VALUES (NEW.owner_id, NEW.id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 'active')
  ON CONFLICT (principal_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_current_accounting_year_on_principal
  AFTER INSERT ON public.principal
  FOR EACH ROW EXECUTE FUNCTION public.create_current_accounting_year();

-- 3. Add accounting_year_id to related tables
ALTER TABLE public.activities
  ADD COLUMN accounting_year_id uuid REFERENCES public.accounting_years(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  ADD COLUMN accounting_year_id uuid REFERENCES public.accounting_years(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN accounting_year_id uuid REFERENCES public.accounting_years(id) ON DELETE SET NULL;

CREATE INDEX idx_activities_accounting_year ON public.activities(accounting_year_id);
CREATE INDEX idx_documents_accounting_year ON public.documents(accounting_year_id);
CREATE INDEX idx_tasks_accounting_year ON public.tasks(accounting_year_id);

-- 4. Backfill current year for existing principals
INSERT INTO public.accounting_years (owner_id, principal_id, year, status)
SELECT owner_id, id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 'active'
FROM public.principal
ON CONFLICT (principal_id, year) DO NOTHING;
