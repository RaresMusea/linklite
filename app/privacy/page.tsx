import type { Metadata } from 'next';
import PrivacyContent from '@/components/shared/footer/privacy_policy/PrivacyPolicyContent';

export const metadata: Metadata = {
    title: 'Privacy Policy | LinkLite',
    description: 'Learn how LinkLite collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background">
            <PrivacyContent />
        </div>
    );
}
