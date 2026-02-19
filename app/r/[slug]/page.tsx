import { findLinkForRedirect } from '@/dal/links/links.repo';
import { notFound } from 'next/navigation';
import { mapRedirectDataToRiskInput } from '@/dal/links/links.mapper';
import { calculateRedirectRiskScoring, RiskResult } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';
import RedirectInterstitial from '@/components/specific/redirect-interstitial/RedirectInterstitial';

type Props = {
    params: Promise<{ slug: string }>;
};

export default async function RedirectPage({ params }: Props) {
    const { slug } = await params;

    const link = await findLinkForRedirect(slug);

    if (!link) {
        notFound();
    }

    const mapped = mapRedirectDataToRiskInput(link);
    const riskScore: RiskResult = calculateRedirectRiskScoring(mapped);

    return (
        <RedirectInterstitial
            slug={slug}
            targetUrl={mapped.targetUrl}
            hostname={mapped.domain?.hostname}
            riskScore={riskScore}
        />
    );
}
