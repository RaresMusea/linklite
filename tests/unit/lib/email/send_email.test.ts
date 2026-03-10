import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    sendMock,
    infoMock,
    errorMock,
    sendEmailCommandCtorMock,
} = vi.hoisted(() => ({
    sendMock: vi.fn(),
    infoMock: vi.fn(),
    errorMock: vi.fn(),
    sendEmailCommandCtorMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-ses', () => ({
    SESClient: class {
        public send = sendMock;
    },
    SendEmailCommand: class {
        public input: unknown;

        constructor(input: unknown) {
            this.input = input;
            sendEmailCommandCtorMock(input);
        }
    },
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        component: vi.fn(() => ({
            child: vi.fn(() => ({
                info: infoMock,
                error: errorMock,
            })),
        })),
    },
}));

import { sendEmail } from '@/lib/email/send_email';

describe('sendEmail tests', () => {
    const originalEmailFrom = process.env.EMAIL_FROM;

    beforeEach(() => {
        sendMock.mockReset();
        infoMock.mockReset();
        errorMock.mockReset();
        sendEmailCommandCtorMock.mockClear();
    });

    afterEach(() => {
        if (originalEmailFrom === undefined) {
            delete process.env.EMAIL_FROM;
        } else {
            process.env.EMAIL_FROM = originalEmailFrom;
        }
    });

    it('Throws when EMAIL_FROM is missing', async () => {
        delete process.env.EMAIL_FROM;

        await expect(
            sendEmail({
                to: 'user@test.com',
                subject: 'Hello',
                html: '<p>Hello</p>',
            }),
        ).rejects.toThrow('EMAIL_FROM env variable is not set');

        expect(errorMock).toHaveBeenCalledWith('Unable to send email to user@test.com.', {
            reason: 'EMAIL_FROM variable was not set',
        });
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('Builds SES payload including text body when provided', async () => {
        process.env.EMAIL_FROM = 'noreply@linklite.dev';
        sendMock.mockResolvedValue({ MessageId: 'msg-123' });

        await sendEmail({
            to: 'user@test.com',
            subject: 'Welcome',
            html: '<p>Welcome</p>',
            text: 'Welcome',
        });

        expect(sendEmailCommandCtorMock).toHaveBeenCalledWith({
            Source: 'noreply@linklite.dev',
            Destination: {
                ToAddresses: ['user@test.com'],
            },
            Message: {
                Subject: {
                    Data: 'Welcome',
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: {
                        Data: '<p>Welcome</p>',
                        Charset: 'UTF-8',
                    },
                    Text: {
                        Data: 'Welcome',
                        Charset: 'UTF-8',
                    },
                },
            },
        });
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledWith('Email sent successfully', {
            to: 'user@test.com',
            messageId: 'msg-123',
        });
    });

    it('Omits SES text body when optional text is not provided', async () => {
        process.env.EMAIL_FROM = 'noreply@linklite.dev';
        sendMock.mockResolvedValue({ MessageId: 'msg-456' });

        await sendEmail({
            to: 'user@test.com',
            subject: 'Only HTML',
            html: '<p>HTML only</p>',
        });

        expect(sendEmailCommandCtorMock).toHaveBeenCalledWith({
            Source: 'noreply@linklite.dev',
            Destination: {
                ToAddresses: ['user@test.com'],
            },
            Message: {
                Subject: {
                    Data: 'Only HTML',
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: {
                        Data: '<p>HTML only</p>',
                        Charset: 'UTF-8',
                    },
                },
            },
        });
    });

    it('Logs an error when SES send fails', async () => {
        process.env.EMAIL_FROM = 'noreply@linklite.dev';
        const sesError = new Error('SES unavailable');
        sendMock.mockRejectedValue(sesError);

        await expect(
            sendEmail({
                to: 'user@test.com',
                subject: 'Hello',
                html: '<p>Hello</p>',
            }),
        ).resolves.toBeUndefined();

        expect(errorMock).toHaveBeenCalledWith(
            'An error occurred while attempting to sent email to user@test.com',
            { err: sesError },
        );
    });
});
