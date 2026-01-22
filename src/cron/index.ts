import colors from "colors";
import cron from 'node-cron';
import { expireOrdersJob } from "./expireOrders";
import { deleteExpiredJob } from "./deleteExpired";


export function initCrons() {
    console.log(colors.yellow.bold("CRON Jobs started Successfully"))

    // Runs every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
        await expireOrdersJob();
    });

    // Runs once a week at 3 AM
    // cron.schedule('* * * * * *', async () => {
    cron.schedule('0 3 * * SUN', async () => {
        await deleteExpiredJob(); 
    })
}
