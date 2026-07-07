
CREATE TABLE public.obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  principal_id UUID NOT NULL REFERENCES public.principal(id) ON DELETE CASCADE,
  accounting_year_id UUID NOT NULL REFERENCES public.accounting_years(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  authority_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  obligation_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  decision_date DATE,
  valid_from DATE,
  valid_until DATE,
  renewal_date DATE,
  reminder_days_before INT NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligations TO authenticated;
GRANT ALL ON public.obligations TO service_role;

ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their obligations"
  ON public.obligations FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER obligations_set_updated_at
  BEFORE UPDATE ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX obligations_principal_year_idx ON public.obligations(principal_id, accounting_year_id);
CREATE INDEX obligations_case_idx ON public.obligations(case_id);
CREATE INDEX obligations_renewal_idx ON public.obligations(renewal_date);
