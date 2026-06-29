import { MembershipRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.comment.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const excelsior = await prisma.workspace.create({
    data: {
      id: "excelsior",
      name: "Excelsior Consulting",
      legalName: "Excelsior Business Manager Pty Ltd",
      abn: "12 345 678 901",
      address: "Sydney NSW",
      contactEmail: "123@123.com",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      invoicePrefix: "EXC",
      quarterLocked: false,
      bankAccounts: {
        create: [
          { name: "Main Business", bank: "NAB", label: "Operating", ownerLabel: "Company" },
          { name: "Raja Expenses", bank: "Westpac", label: "Expense account", ownerLabel: "Raja" },
          { name: "Charchit Expenses", bank: "CBA", label: "Expense account", ownerLabel: "Charchit" }
        ]
      },
      categories: {
        create: [
          {
            name: "Consulting income",
            type: "INCOME",
            defaultGstTreatment: "GST_INCLUDED",
            basTreatment: "GST_COLLECTED"
          },
          {
            name: "Software",
            type: "EXPENSE",
            defaultGstTreatment: "GST_INCLUDED",
            basTreatment: "GST_PAID"
          },
          {
            name: "Internet",
            type: "EXPENSE",
            defaultGstTreatment: "GST_INCLUDED",
            basTreatment: "GST_PAID"
          },
          {
            name: "Bank fees",
            type: "EXPENSE",
            defaultGstTreatment: "GST_FREE",
            basTreatment: "NONE"
          }
        ]
      },
      people: {
        create: [
          {
            name: "Business Owner",
            email: "123@123.com",
            personType: "DIRECTOR",
            workspaceRole: "DIRECTOR",
            payrollEnabled: true,
            payrollBasis: "SALARY",
            salaryPerPayPeriodCents: 300000,
            superRateBps: 1100
          },
          {
            name: "Accountant",
            email: "234@234.com",
            personType: "ACCOUNTANT",
            workspaceRole: "ACCOUNTANT"
          },
          {
            name: "Sample Employee",
            email: "345@345.com",
            personType: "EMPLOYEE",
            workspaceRole: "EMPLOYEE",
            payrollEnabled: true,
            payrollBasis: "HOURLY",
            hourlyRateCents: 4500,
            ordinaryHoursPerPayPeriod: 60,
            superRateBps: 1100
          }
        ]
      }
    }
  });

  const harbour = await prisma.workspace.create({
    data: {
      id: "harbour-advisory",
      name: "Harbour Advisory",
      legalName: "Harbour Advisory Pty Ltd",
      abn: "98 765 432 109",
      address: "Melbourne VIC",
      contactEmail: "456@456.com",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      invoicePrefix: "HBR",
      quarterLocked: false,
      bankAccounts: {
        create: [{ name: "Harbour Main", bank: "ANZ", label: "Operating", ownerLabel: "Company" }]
      },
      categories: {
        create: [
          {
            name: "Advisory income",
            type: "INCOME",
            defaultGstTreatment: "GST_INCLUDED",
            basTreatment: "GST_COLLECTED"
          },
          {
            name: "Subscriptions",
            type: "EXPENSE",
            defaultGstTreatment: "GST_INCLUDED",
            basTreatment: "GST_PAID"
          }
        ]
      },
      people: {
        create: [
          {
            name: "Harbour Director",
            email: "456@456.com",
            personType: "DIRECTOR",
            workspaceRole: "DIRECTOR",
            payrollEnabled: true,
            payrollBasis: "SALARY",
            salaryPerPayPeriodCents: 320000,
            superRateBps: 1100
          }
        ]
      }
    }
  });

  const owner = await prisma.user.create({
    data: {
      id: "supabase:123@123.com",
      authProvider: "supabase",
      authProviderUserId: "123@123.com",
      name: "Business Owner",
      email: "123@123.com"
    }
  });

  const accountant = await prisma.user.create({
    data: {
      id: "supabase:234@234.com",
      authProvider: "supabase",
      authProviderUserId: "234@234.com",
      name: "Accountant",
      email: "234@234.com"
    }
  });

  const multiCompany = await prisma.user.create({
    data: {
      id: "supabase:456@456.com",
      authProvider: "supabase",
      authProviderUserId: "456@456.com",
      name: "Multi Company User",
      email: "456@456.com"
    }
  });

  const viewer = await prisma.user.create({
    data: {
      id: "supabase:789@789.com",
      authProvider: "supabase",
      authProviderUserId: "789@789.com",
      name: "Viewer User",
      email: "789@789.com"
    }
  });

  await prisma.membership.createMany({
    data: [
      { userId: owner.id, workspaceId: excelsior.id, role: MembershipRole.ADMIN },
      { userId: owner.id, workspaceId: harbour.id, role: MembershipRole.ADMIN },
      { userId: accountant.id, workspaceId: excelsior.id, role: MembershipRole.ACCOUNTANT },
      { userId: multiCompany.id, workspaceId: excelsior.id, role: MembershipRole.EDITOR },
      { userId: multiCompany.id, workspaceId: harbour.id, role: MembershipRole.ACCOUNTANT },
      { userId: viewer.id, workspaceId: harbour.id, role: MembershipRole.VIEWER }
    ]
  });

  const software = await prisma.category.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Software" }
  });
  const internet = await prisma.category.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Internet" }
  });
  const bankFees = await prisma.category.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Bank fees" }
  });
  const raja = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Raja Expenses" }
  });
  const charchit = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Charchit Expenses" }
  });
  const main = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: excelsior.id, name: "Main Business" }
  });
  const ownerPerson = await prisma.person.findFirstOrThrow({
    where: { workspaceId: excelsior.id, email: "123@123.com" }
  });
  const employeePerson = await prisma.person.findFirstOrThrow({
    where: { workspaceId: excelsior.id, email: "345@345.com" }
  });
  const northstar = await prisma.client.create({
    data: {
      workspaceId: excelsior.id,
      name: "Northstar Labs",
      email: "accounts@northstar.example",
      abn: "11 222 333 444",
      billingAddress: "1 Market St, Sydney NSW"
    }
  });
  const bluegum = await prisma.client.create({
    data: {
      workspaceId: excelsior.id,
      name: "Bluegum Systems",
      email: "finance@bluegum.example",
      abn: "55 666 777 888",
      billingAddress: "99 Collins St, Melbourne VIC"
    }
  });

  await prisma.expense.createMany({
    data: [
      {
        workspaceId: excelsior.id,
        date: new Date("2025-05-14T00:00:00.000Z"),
        supplier: "Legacy AWS",
        categoryId: software.id,
        bankAccountId: raja.id,
        grossCents: 27500,
        gstTreatment: "GST_INCLUDED",
        receiptUrl: "https://drive.google.com/example/legacy-aws",
        notes: "Historical quarter sample"
      },
      {
        workspaceId: excelsior.id,
        date: new Date("2026-04-12T00:00:00.000Z"),
        supplier: "AWS",
        categoryId: software.id,
        bankAccountId: raja.id,
        grossCents: 33000,
        gstTreatment: "GST_INCLUDED",
        receiptUrl: "https://drive.google.com/example/aws",
        notes: "Cloud hosting"
      },
      {
        workspaceId: excelsior.id,
        date: new Date("2026-05-05T00:00:00.000Z"),
        supplier: "Telstra",
        categoryId: internet.id,
        bankAccountId: charchit.id,
        grossCents: 22000,
        gstTreatment: "MANUAL_OVERRIDE",
        userEnteredGstCents: 1500,
        overrideReason: "Mixed business/private usage"
      },
      {
        workspaceId: excelsior.id,
        date: new Date("2026-06-02T00:00:00.000Z"),
        supplier: "Bank",
        categoryId: bankFees.id,
        bankAccountId: main.id,
        grossCents: 2800,
        gstTreatment: "GST_FREE"
      }
    ]
  });

  await prisma.invoice.createMany({
    data: [
      {
        workspaceId: excelsior.id,
        clientId: northstar.id,
        personId: ownerPerson.id,
        invoiceNumber: "EXC-000",
        issueDate: new Date("2025-06-18T00:00:00.000Z"),
        dueDate: new Date("2025-07-02T00:00:00.000Z"),
        status: "PAID",
        grossCents: 8800,
        gstTreatment: "GST_INCLUDED",
        paymentDate: new Date("2025-06-30T00:00:00.000Z"),
        evidenceUrl: "https://drive.google.com/example/exc-000",
        notes: "Legacy retainer"
      },
      {
        workspaceId: excelsior.id,
        clientId: northstar.id,
        personId: ownerPerson.id,
        invoiceNumber: "EXC-001",
        issueDate: new Date("2026-04-08T00:00:00.000Z"),
        dueDate: new Date("2026-04-22T00:00:00.000Z"),
        status: "PAID",
        grossCents: 11000,
        gstTreatment: "GST_INCLUDED",
        paymentDate: new Date("2026-04-20T00:00:00.000Z"),
        evidenceUrl: "https://drive.google.com/example/exc-001",
        notes: "Quarter retainer"
      },
      {
        workspaceId: excelsior.id,
        clientId: bluegum.id,
        personId: ownerPerson.id,
        invoiceNumber: "EXC-002",
        issueDate: new Date("2026-05-12T00:00:00.000Z"),
        dueDate: new Date("2026-05-26T00:00:00.000Z"),
        status: "ISSUED",
        grossCents: 6600,
        gstTreatment: "GST_INCLUDED",
        notes: "Implementation work"
      }
    ]
  });

  await prisma.payRun.createMany({
    data: [
      {
        workspaceId: excelsior.id,
        personId: employeePerson.id,
        employeeName: "Sample Employee",
        periodStart: new Date("2025-04-01T00:00:00.000Z"),
        periodEnd: new Date("2025-04-14T00:00:00.000Z"),
        payDate: new Date("2025-04-15T00:00:00.000Z"),
        grossCents: 280000,
        reimbursementsCents: 0,
        paygCents: 54000,
        superCents: 29400,
        finalized: true,
        status: "FINALIZED",
        submissionStatus: "ACCEPTED"
      },
      {
        workspaceId: excelsior.id,
        personId: employeePerson.id,
        employeeName: "Sample Employee",
        periodStart: new Date("2026-04-01T00:00:00.000Z"),
        periodEnd: new Date("2026-04-14T00:00:00.000Z"),
        payDate: new Date("2026-04-15T00:00:00.000Z"),
        grossCents: 300000,
        reimbursementsCents: 12000,
        paygCents: 62000,
        superCents: 34500,
        finalized: true,
        status: "FINALIZED",
        submissionStatus: "ACCEPTED"
      },
      {
        workspaceId: excelsior.id,
        personId: employeePerson.id,
        employeeName: "Sample Employee",
        periodStart: new Date("2026-04-15T00:00:00.000Z"),
        periodEnd: new Date("2026-04-28T00:00:00.000Z"),
        payDate: new Date("2026-04-29T00:00:00.000Z"),
        grossCents: 300000,
        reimbursementsCents: 0,
        paygCents: 62000,
        superCents: 34500,
        finalized: false,
        status: "DRAFT",
        submissionStatus: "DRAFT",
        overrideReason: "Draft pay run pending review"
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
