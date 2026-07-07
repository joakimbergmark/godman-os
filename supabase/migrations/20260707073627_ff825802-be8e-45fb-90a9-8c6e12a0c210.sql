
-- Cases table
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  principal_id uuid NOT NULL REFERENCES public.principal(id) ON DELETE CASCADE,
  accounting_year_id uuid NOT NULL REFERENCES public.accounting_years(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  life_area text NOT NULL DEFAULT 'other',
  authority_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  priority text NOT NULL DEFAULT 'medium',
  start_date date,
  due_date date,
  completed_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cases" ON public.cases FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER cases_set_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX cases_year_idx ON public.cases(accounting_year_id);
CREATE INDEX cases_status_idx ON public.cases(status);

-- Case decisions
CREATE TABLE public.case_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_decisions TO authenticated;
GRANT ALL ON public.case_decisions TO service_role;
ALTER TABLE public.case_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages case_decisions" ON public.case_decisions FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER case_decisions_set_updated_at BEFORE UPDATE ON public.case_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX case_decisions_case_idx ON public.case_decisions(case_id);

-- Add case_id to existing tables
ALTER TABLE public.activities   ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
ALTER TABLE public.tasks        ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
ALTER TABLE public.documents    ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;

CREATE INDEX activities_case_idx   ON public.activities(case_id);
CREATE INDEX tasks_case_idx        ON public.tasks(case_id);
CREATE INDEX documents_case_idx    ON public.documents(case_id);
CREATE INDEX transactions_case_idx ON public.transactions(case_id);
