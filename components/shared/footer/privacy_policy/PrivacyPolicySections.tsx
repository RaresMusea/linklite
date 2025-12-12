import { ReactNode } from 'react';

type PrivacySection = {
    id: string;
    title: string;
    body: ReactNode;
};

export const privacySections: PrivacySection[] = [
    {
        id: '1',
        title: 'Introduction',
        body: (
            <p>
                This Privacy Policy explains how <span className="font-semibold">LinkLite</span> (&quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal data when you use our
                website, products, and services (collectively, the &quot;Service&quot;). By accessing or using the
                Service, you agree to the practices described in this Policy.
            </p>
        ),
    },
    {
        id: '2',
        title: 'Information We Collect',
        body: (
            <>
                <p className="mb-2">We may collect the following categories of information when you use the Service:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>
                        <span className="font-medium">Account information</span> – such as your name, email address,
                        password, and workspace details.
                    </li>
                    <li>
                        <span className="font-medium">Usage data</span> – such as pages visited, links created or
                        managed, clicks, device information, browser type, and IP address.
                    </li>
                    <li>
                        <span className="font-medium">Communication data</span> – such as your messages, support
                        requests, and feedback.
                    </li>
                    <li>
                        <span className="font-medium">Billing information</span> – if you purchase a paid plan, certain
                        payment and billing details are processed by our payment providers.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: '3',
        title: 'How We Use Your Information',
        body: (
            <>
                <p className="mb-2">We use the information we collect for the following purposes:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>To provide, operate, and maintain the Service.</li>
                    <li>To personalize your experience and improve our features.</li>
                    <li>To communicate with you about updates, security alerts, and support.</li>
                    <li>To process payments and manage your subscriptions.</li>
                    <li>To monitor usage, detect, prevent, and address technical issues or abuse.</li>
                    <li>To comply with legal obligations and enforce our Terms &amp; Conditions.</li>
                </ul>
            </>
        ),
    },
    {
        id: '4',
        title: 'Legal Basis for Processing',
        body: (
            <p>
                If you are located in the European Economic Area (EEA) or a similar jurisdiction, our legal bases for
                processing your personal data may include: your consent, performance of a contract, compliance with
                legal obligations, and our legitimate interests in operating, improving, and protecting the Service.
            </p>
        ),
    },
    {
        id: '5',
        title: 'Cookies and Similar Technologies',
        body: (
            <>
                <p className="mb-2">We may use cookies, local storage, and similar technologies to:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Remember your preferences and login sessions.</li>
                    <li>Understand how you interact with the Service.</li>
                    <li>Improve performance and security.</li>
                </ul>
                <p className="mt-2">
                    You can usually manage or disable cookies through your browser settings, but some features of the
                    Service may not function properly if cookies are disabled.
                </p>
            </>
        ),
    },
    {
        id: '6',
        title: 'Analytics',
        body: (
            <p>
                We may use analytics tools to help us understand how the Service is used and to improve it over time.
                These tools may collect information such as your IP address, device information, and interactions with
                the Service, in accordance with their own privacy policies.
            </p>
        ),
    },
    {
        id: '7',
        title: 'Data Sharing and Third Parties',
        body: (
            <>
                <p className="mb-2">We do not sell your personal data. We may share your information with:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>
                        <span className="font-medium">Service providers</span> that help us with hosting, analytics,
                        payments, email delivery, and customer support.
                    </li>
                    <li>
                        <span className="font-medium">Business partners</span> when needed to provide integrations or
                        features you choose to use.
                    </li>
                    <li>
                        <span className="font-medium">Authorities or other parties</span> when required by law or to
                        protect our rights, users, or the public.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: '8',
        title: 'International Data Transfers',
        body: (
            <p>
                Your information may be stored and processed in countries other than your own. Where required by law, we
                implement appropriate safeguards to protect your personal data in connection with such transfers.
            </p>
        ),
    },
    {
        id: '9',
        title: 'Data Retention',
        body: (
            <p>
                We retain your personal data for as long as necessary to provide the Service, comply with legal
                obligations, resolve disputes, and enforce our agreements. When data is no longer needed, we will delete
                or anonymize it in a secure manner.
            </p>
        ),
    },
    {
        id: '10',
        title: 'Your Rights',
        body: (
            <>
                <p className="mb-2">
                    Depending on your jurisdiction, you may have certain rights regarding your personal data, such as:
                </p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Accessing the personal data we hold about you.</li>
                    <li>Requesting correction or deletion of your data.</li>
                    <li>Objecting to or restricting certain processing.</li>
                    <li>Withdrawing your consent where processing is based on consent.</li>
                    <li>Requesting data portability, where applicable.</li>
                </ul>
                <p className="mt-2">
                    To exercise these rights, please contact us using the details provided in the Contact section below.
                    We may need to verify your identity before fulfilling certain requests.
                </p>
            </>
        ),
    },
    {
        id: '11',
        title: 'Data Security',
        body: (
            <p>
                We implement reasonable technical and organizational measures to protect your personal data against
                unauthorized access, loss, misuse, or alteration. However, no method of transmission over the internet
                or electronic storage is completely secure, and we cannot guarantee absolute security.
            </p>
        ),
    },
    {
        id: '12',
        title: 'Children’s Privacy',
        body: (
            <p>
                The Service is not intended for use by children under the age of 16, and we do not knowingly collect
                personal data from children. If you believe that a child has provided us with personal data, please
                contact us so that we can take appropriate action.
            </p>
        ),
    },
    {
        id: '13',
        title: 'Third-Party Links',
        body: (
            <p>
                The Service may contain links to third-party websites or services that are not operated by us. We are
                not responsible for the privacy practices of these third parties and encourage you to review their
                privacy policies before providing any personal information.
            </p>
        ),
    },
    {
        id: '14',
        title: 'Changes to This Policy',
        body: (
            <p>
                We may update this Privacy Policy from time to time. When we do, we will revise the &quot;Last
                updated&quot; date at the top of this page. Your continued use of the Service after any changes become
                effective constitutes your acceptance of the updated Policy.
            </p>
        ),
    },
    {
        id: '15',
        title: 'Contact',
        body: (
            <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us
                at: <span className="font-medium">privacy@linklite.app</span>
                {/* replace with your real contact email */}
            </p>
        ),
    },
];
