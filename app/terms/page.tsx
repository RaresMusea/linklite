import type { Metadata } from 'next';
import TermsContent from '@/components/shared/footer/terms_conditions/TermsContent';

export const metadata: Metadata = {
    title: 'Terms & Conditions | LinkLite',
    description: 'Read the Terms & Conditions for using the LinkLite platform.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <TermsContent />
        </div>
    );
}