# Care Assistant

## Vision

Care Assistant är inte ett ekonomisystem.

Care Assistant är ett operativt arbetsverktyg för gode män och förvaltare.

Systemet skall hjälpa användaren att:

- komma ihåg

- planera

- följa upp

- dokumentera

- redovisa

Målet är att minska administration och minska risken att missa viktiga beslut eller deadlines.

---

# Designprinciper

## Arbeta utifrån ärenden

Användaren arbetar inte med tabeller.

Användaren arbetar med ärenden.

Alla objekt skall därför kunna kopplas till ett Case.

Case är navet.

---

## Dashboard före administration

Dashboard skall svara på frågan:

Vad behöver jag göra idag?

Inte:

Hur mycket data finns i systemet?

---

## Beslut är levande objekt

Ett myndighetsbeslut är inte bara ett dokument.

Det har:

- giltighetstid

- uppföljning

- omprövning

- påminnelser

Därför är Obligations en egen entitet.

---

## Timeline

All historik skall kunna visas kronologiskt.

Oavsett om det är:

- aktivitet

- dokument

- transaktion

- uppgift

- beslut

---

## Redovisningsår

All ekonomi och relevanta aktiviteter kopplas till ett redovisningsår.

Historiken skall kunna filtreras per år.

---

# Domänmodell

Principal

↓

Accounting Year

↓

Case

↓

Obligation

↓

Task

↓

Activity

↓

Transaction

↓

Document

↓

Timeline

---

# Livsområden

Alla Cases kan tillhöra ett livsområde.

## Ekonomi

Budget

Bank

Räkningar

Bidrag

---

## Myndigheter

Kommun

Försäkringskassan

Skatteverket

Överförmyndaren

---

## Hälsa

Läkare

Tandvård

Läkemedel

Vårdplanering

---

## Färdtjänst & transporter

Färdtjänst

Parkeringstillstånd

Resor

---

## Boende

Hyra

Boendestöd

Lägenhet

Fastighet

---

## Sysselsättning

Daglig verksamhet

Arbete

Studier

Aktiviteter

---

## Familj & nätverk

Anhöriga

God kontakt

Kontaktperson

---

## Juridik

Domstol

Fullmakter

Avtal

Beslut

---

# Arkitekturprincip

Vi registrerar inte data för datans skull.

Vi registrerar endast information som hjälper användaren att utföra sitt uppdrag.

---

# Produktprincip

Systemet skall hjälpa användaren att veta:

- Vad behöver jag göra idag?

- Vad håller på att löpa ut?

- Vad saknas?

- Vad väntar på svar?

- Vad behöver redovisas?
