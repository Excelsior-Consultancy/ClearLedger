import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.workspace.deleteMany();

  await prisma.workspace.create({
    data: {
      id: "excelsior",
      name: "Excelsior Consulting",
      legalName: "Excelsior Business Manager Pty Ltd",
      abn: "12 345 678 901",
      address: "Sydney NSW",
      contactEmail: "owner@example.com",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      invoicePrefix: "EXC",
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
            email: "owner@example.com",
            personType: "DIRECTOR",
            workspaceRole: "DIRECTOR",
            payrollEnabled: true
          },
          {
            name: "Accountant",
            email: "ca@example.com",
            personType: "ACCOUNTANT",
            workspaceRole: "ACCOUNTANT"
          },
          {
            name: "Sample Employee",
            email: "employee@example.com",
            personType: "EMPLOYEE",
            workspaceRole: "EMPLOYEE",
            payrollEnabled: true
          }
        ]
      }
    }
  });

  const software = await prisma.category.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Software" }
  });
  const internet = await prisma.category.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Internet" }
  });
  const bankFees = await prisma.category.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Bank fees" }
  });
  const raja = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Raja Expenses" }
  });
  const charchit = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Charchit Expenses" }
  });
  const main = await prisma.bankAccount.findFirstOrThrow({
    where: { workspaceId: "excelsior", name: "Main Business" }
  });

  await prisma.expense.createMany({
    data: [
      {
        workspaceId: "excelsior",
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
        workspaceId: "excelsior",
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
        workspaceId: "excelsior",
        date: new Date("2026-06-02T00:00:00.000Z"),
        supplier: "Bank",
        categoryId: bankFees.id,
        bankAccountId: main.id,
        grossCents: 2800,
        gstTreatment: "GST_FREE"
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
