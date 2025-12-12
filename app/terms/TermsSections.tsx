import { ReactNode } from 'react';

type TermsSection = {
    id: string;
    title: string;
    body: ReactNode;
};

export const termsSections: TermsSection[] = [
    {
        id: '1',
        title: 'Eligibility',
        body: (
            <p>
                To use the Service, you must be at least 18 years old or the age of majority in your
        jurisdiction and have the legal capacity to enter into a binding agreement. By using the
        Service, you represent and warrant that you meet these requirements.
    </p>
),
},
{
    id: '2',
        title: 'Account Registration',
    body: (
    <>
        <p className="mb-2">
        To access certain features, you may be required to create an account. You agree to:
    </p>
    <ul className="list-disc list-inside space-y-1">
    <li>Provide accurate, current, and complete information.</li>
<li>Maintain and promptly update your information as needed.</li>
<li>Keep your login credentials secure and not share them with others.</li>
</ul>
<p className="mt-2">
    You are responsible for all activities that occur under your account. If you suspect any
    unauthorized use, you must notify us immediately.
</p>
</>
),
},
{
    id: '3',
        title: 'Access to the Service',
    body: (
    <p>
        We provide the Service on an &quot;as available&quot; basis. We may modify, suspend, or
    discontinue any part of the Service at any time, with or without notice, and without
    liability to you.
</p>
),
},
{
    id: '4',
        title: 'User Responsibilities',
    body: (
    <>
        <p className="mb-2">
        You agree to use the Service only for lawful purposes and in compliance with these Terms
    and all applicable laws and regulations. You are responsible for:
    </p>
    <ul className="list-disc list-inside space-y-1">
    <li>
        The content, links, and data you create, upload, manage, or share through LinkLite.
</li>
<li>
Ensuring that your use of LinkLite does not infringe or violate any third-party rights.
</li>
</ul>
</>
),
},
{
    id: '5',
        title: 'Subscriptions & Payments',
    body: (
    <p>
        Certain features of the Service may be offered on a paid subscription basis. By subscribing,
    you authorize us or our payment processors to charge the applicable fees using your selected
    payment method. Unless otherwise stated, subscription fees are non-refundable and may renew
    automatically until cancelled.
</p>
),
},
{
    id: '6',
        title: 'Intellectual Property',
    body: (
    <>
        <p className="mb-2">
        All rights, title, and interest in and to the Service, including but not limited to the
    software, design, text, graphics, logos, and trademarks, are owned by LinkLite or its
    licensors.
    </p>
    <p>
    You are granted a limited, non-exclusive, non-transferable, and revocable license to
    access and use the Service in accordance with these Terms. You may not copy, modify,
    distribute, sell, or lease any part of the Service unless expressly permitted by us.
</p>
</>
),
},
{
    id: '7',
        title: 'Third-Party Services',
    body: (
    <p>
        The Service may integrate with or contain links to third-party websites, tools, or services.
    We do not control and are not responsible for these third parties. Your use of third-party
    services is subject to their own terms and policies.
</p>
),
},
{
    id: '8',
        title: 'Data & Privacy',
    body: (
    <p>
        We collect and process personal data in accordance with our Privacy Policy. By using the
    Service, you consent to such processing. Please review our Privacy Policy for more details
    on how we handle your information.
</p>
),
},
{
    id: '9',
        title: 'Prohibited Use',
    body: (
    <>
        <p className="mb-2">You agree not to use the Service to:</p>
<ul className="list-disc list-inside space-y-1">
    <li>Engage in any unlawful, harmful, or fraudulent activity.</li>
<li>
Upload or share content that is abusive, defamatory, or infringes others&apos; rights.
</li>
<li>Attempt to gain unauthorized access to the Service, accounts, or systems.</li>
<li>Interfere with or disrupt the integrity or performance of the Service.</li>
</ul>
</>
),
},
{
    id: '10',
        title: 'Termination',
    body: (
    <p>
        We may suspend or terminate your access to the Service at any time, with or without notice,
    if we reasonably believe you have violated these Terms or are otherwise using the Service in
a harmful or unlawful manner. Upon termination, your right to use the Service will
    immediately cease.
</p>
),
},
{
    id: '11',
        title: 'Disclaimers',
    body: (
    <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
    warranties of any kind, whether express or implied, including but not limited to warranties
    of merchantability, fitness for a particular purpose, or non-infringement. We do not
    guarantee that the Service will be uninterrupted, secure, or error-free.
</p>
),
},
{
    id: '12',
        title: 'Limitation of Liability',
    body: (
    <p>
        To the maximum extent permitted by law, LinkLite and its affiliates, directors, employees,
    and agents shall not be liable for any indirect, incidental, special, consequential, or
    punitive damages, or any loss of profits or data, arising out of or in connection with your
    use of the Service, even if we have been advised of the possibility of such damages.
</p>
),
},
{
    id: '13',
        title: 'Changes to the Terms',
    body: (
    <p>
        We may update these Terms from time to time. When we do, we will revise the &quot;Last
    updated&quot; date at the top of this page. Your continued use of the Service after any
    changes become effective constitutes your acceptance of the revised Terms.
</p>
),
},
{
    id: '14',
        title: 'Governing Law',
    body: (
    <p>
        These Terms shall be governed by and construed in accordance with the laws of the
    jurisdiction in which LinkLite is established, without regard to its conflict of law
    principles.
    </p>
),
},
{
    id: '15',
        title: 'Contact',
    body: (
    <p>
        If you have any questions about these Terms, please contact us at:{' '}
    <span className="font-medium">support@linklite.app</span>
    {/* replace with your real contact email */}
    </p>
),
},
];