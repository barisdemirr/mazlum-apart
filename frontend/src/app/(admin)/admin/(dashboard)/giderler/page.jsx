import ExpensesView from "@/components/admin/accounting/ExpensesView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Giderler" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [data, categories, accounts] = await Promise.all([adminGet("/expenses", { periodId: period.id }), adminGet("/expense-categories"), adminGet("/accounts")]);
    return <ExpensesView data={data} categories={categories} accounts={accounts.filter((a) => a.active)} />;
}
