import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logging/logger';

const ses = new SESClient({
    region: process.env.AWS_REGION,
});

type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

const emailLogger = logger.component('lib.email').child(undefined, ['lib', 'email']);

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
    const from = process.env.EMAIL_FROM;

    if (!from) {
        emailLogger.error(`Unable to send email to ${to}.`, {
            reason: 'EMAIL_FROM variable was not set',
        });
        throw new Error('EMAIL_FROM env variable is not set');
    }

    const command = new SendEmailCommand({
        Source: from,
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: html,
                    Charset: 'UTF-8',
                },
                ...(text && {
                    Text: {
                        Data: text,
                        Charset: 'UTF-8',
                    },
                }),
            },
        },
    });

    try {
        const result = await ses.send(command);
        emailLogger.info(`Email sent successfully`, {
            to,
            messageId: result.MessageId,
        });
    } catch (err) {
        emailLogger.error(`An error occurred while attempting to sent email to ${to}`, { err });
        throw err;
    }
}
