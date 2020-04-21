import schedule from 'node-schedule';
import { v4 as uuidv4 } from 'uuid';
import ScheduledMessage from './models/scheduledMessage.js';
import moment from 'moment';

class RecurringJobSystem {
    constructor() {
        this.jobCache = new Map();
    }

    getAll(callback) {
        ScheduledMessage.find({}, function(err, result) {
            if(err) {
                console.error(error);
                callback(error, []);
            } else {
                callback(null, result);
            }
        });
    }

    getEnabled(callback) {
        // Jobs that are past their end point are not active, even if they haven't been specifically disabled
        // TODO: We need to test this query syntax, and it currently only checks enabled since recurring.end is
        // an optional field and idk how to say 'if it isn't present or is $gt now'
        ScheduledMessage.find({ 'enabled': true }, function(err, result) {
            if(err) {
                console.error(error);
                callback(error, []);
            } else {
                callback(null, result);
            }
        });
    }

    getRunning() {
        // Spread operator to convert the keys iterator to an array
        return [...this.jobCache.keys()];
    }

    isRunning(jobUUID) {
        return this.jobCache.has(jobUUID);
    }

    getJob(jobUUID) {
        // TODO: Should this look into the mongo db for the job since its by ID? perhaps getRunning with an ID
        // returns running only and getJob return running or mongo?
        return this.jobCache.has(jobUUID)? this.jobCache.get(jobUUID): null;
    }
    
    createJob({
        second = null,
        minute = null,
        hour = null,
        date = null,
        month = null,
        year = null,
        dayOfWeek = null,
        message,
        toNumber,
        uuid = null
    }) {
        // Allowing the user to pass in an optional uuid for the future case
        // where we need to reboot the server and want it to be bootstrapped
        // from the mongo db and carry the old uuids for book keeping
        const jobUUID = (uuid) ? uuid : uuidv4();

        // Create the mongo model for the recurring job and use it as the
        // validation step
        const scheduledMessage = new ScheduledMessage({
            toPhoneNumber: toNumber,
            message: message,
            scheduled_uuid: jobUUID,
            fromPhoneNumber: process.env.TWILIO_SMS_NUMBER,
            recurring: {
                rules: [{
                    dayOfWeek: dayOfWeek,
                    hour: hour,
                    minute: minute,
                    second: second,
                }]
            }
        });
        scheduledMessage.save( (err,msg) => { if (err) { console.error(err); return jobUUID; } });
        // TODO: Figure out how we want to handle the above failure case
        console.log(`${jobUUID} -- job saved`);

        // All null values will have the system run every 1 min
        var rule = new schedule.RecurrenceRule();

        if (second !== null) { rule.second = second }
        // Everything defaults to null except second, so we don't need
        // to check here before setting
        rule.minute = (minute) ? minute : null;
        rule.hour = (hour) ? hour : null;
        rule.date = (date) ? date : null;
        rule.month = (month) ? month : null;
        rule.year = (year) ? year : null;
        rule.dayOfWeek = (dayOfWeek && dayOfWeek.length > 0) ? dayOfWeek : null;
        console.log(`Rule: ${JSON.stringify(rule)}`);

        var job = schedule.scheduleJob(rule, () => {
            // We will want to replace this with a twilio sms function here
            // or let users pass in a function
            console.log(`[${new Date()}] ${message} being mock sent to ${toNumber}`);
        })
        console.log(`${jobUUID} -- job created`);

        // Cache the job so we can keep track of it
        this.jobCache.set(jobUUID, job);
        console.log(`${jobUUID} -- job registered`);

        return jobUUID;
    }

    deleteJob(jobUUID) {
        console.log(`${jobUUID} -- attempting to delete job`)

        if (this.jobCache.has(jobUUID)) {
            // Cancel the job and remove it from the cache
            ScheduledMessage.updateOne({scheduled_uuid: jobUUID},{$set:{enabled: false}},function(err,res) {
                if (err) { console.log(err); }
            });
            this.jobCache.get(jobUUID).cancel();
            this.jobCache.delete(jobUUID);
            console.log(`${jobUUID} -- job found and cancelled`);
            return true;
        } 

        console.error(`${jobUUID} -- job not found`);
        return false;
    }
}

export default RecurringJobSystem;
