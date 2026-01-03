import colors from "colors";
import cron from 'node-cron';
import { expireOrdersJob } from "./expireOrders";


export function initCrons() {
    console.log(colors.yellow.bold("CRON Jobs started Successfully"))
    cron.schedule('*/2 * * * *', async () => {
        await expireOrdersJob();
    });
}
