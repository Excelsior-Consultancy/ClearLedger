import crypto from "node:crypto";
import { MembershipRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "pwd@123";
const PASSWORD_ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return { salt, hash };
}

async function main() {
  await prisma.comment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const ownerAuth = hashPassword(PASSWORD);
  const accountantAuth = hashPassword(PASSWORD);
  const multiAuth = hashPassword(PASSWORD);
  const viewerAuth = hashPassword(PASSWORD);

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
            payrollEnabled: true
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
            payrollEnabled: true
          }
        ]
      }
    }
  });

  const excelsiorQuarter = await prisma.reportingQuarter.create({
    data: {
      workspaceId: excelsior.id,
      label: "Q4 FY2025-26",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      locked: false
    }
  });

  await prisma.workspace.update({
    where: { id: excelsior.id },
    data: { activeQuarterId: excelsiorQuarter.id }
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
            payrollEnabled: true
          }
        ]
      }
    }
  });

  const harbourQuarter = await prisma.reportingQuarter.create({
    data: {
      workspaceId: harbour.id,
      label: "Q4 FY2025-26",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      locked: false
    }
  });

  await prisma.workspace.update({
    where: { id: harbour.id },
    data: { activeQuarterId: harbourQuarter.id }
  });

  const owner = await prisma.user.create({
    data: {
      name: "Business Owner",
      email: "123@123.com",
      passwordHash: ownerAuth.hash,
      passwordSalt: ownerAuth.salt
    }
  });

  const accountant = await prisma.user.create({
    data: {
      name: "Accountant",
      email: "234@234.com",
      passwordHash: accountantAuth.hash,
      passwordSalt: accountantAuth.salt
    }
  });

  const multiCompany = await prisma.user.create({
    data: {
      name: "Multi Company User",
      email: "456@456.com",
      passwordHash: multiAuth.hash,
      passwordSalt: multiAuth.salt
    }
  });

  const viewer = await prisma.user.create({
    data: {
      name: "Viewer User",
      email: "789@789.com",
      passwordHash: viewerAuth.hash,
      passwordSalt: viewerAuth.salt
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
