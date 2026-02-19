import { LinkRedirectData, LinkRiskInput } from '@/dal/links/links.types';
import { DomainStatus } from '@/generated/prisma/enums';

export function mapRedirectDataToRiskInput(data: LinkRedirectData): LinkRiskInput {
    return {
        targetUrl: data.targetUrl,
        isShortener: Boolean(data.isShortener),
        hasRedirect: Boolean(data.redirectTargetUrl),
        redirectStatusCode: data.redirectStatusCode ?? undefined,
        domain: data.domain
            ? {
                  hostname: data.domain.hostname,
                  registeredAt: data.domain.registeredAt,
                  checkedAt: data.domain.checkedAt,
                  status: data.domain.status as DomainStatus,
              }
            : null,
    };
}
