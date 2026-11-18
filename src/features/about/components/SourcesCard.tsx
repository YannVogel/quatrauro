import { strings } from '@/i18n';
import { Card, Text } from '@/ui';

import type { ModelSource, StationSource } from '../about';
import { LINKS } from '../links';
import { AboutSection } from './AboutSection';
import { ExternalLink } from './ExternalLink';

type SourcesCardProps = {
  readonly models: readonly ModelSource[];
  readonly stations: readonly StationSource[];
};

/** D'où viennent les données, avec la mention que demande chaque licence. */
export function SourcesCard({ models, stations }: SourcesCardProps) {
  const { about } = strings;
  return (
    <Card testID="about-sources">
      <Text variant="section" accessibilityRole="header">
        {about.sourcesTitle}
      </Text>

      <AboutSection title={about.forecastsTitle}>
        <ExternalLink label={about.openMeteoCredit} url={LINKS.openMeteo} />
        <Text>{about.openMeteoChanges}</Text>
        <ExternalLink label={about.ccBy} url={LINKS.ccBy} />
      </AboutSection>

      <AboutSection title={about.modelsTitle}>
        {models.map((source) => (
          <Text key={source.provider}>{about.modelSource(source.provider, source.models)}</Text>
        ))}
      </AboutSection>

      <AboutSection title={about.observationsTitle}>
        <ExternalLink label={about.observationsCredit} url={LINKS.observations} />
        <Text>{about.observationsDataset}</Text>
        {stations.map((source) => (
          <Text key={source.stationId}>
            {about.station(source.city, source.station, source.stationId)}
          </Text>
        ))}
        <Text color="textMuted">{about.stationNote}</Text>
        <ExternalLink label={about.openLicence} url={LINKS.openLicence} />
      </AboutSection>
    </Card>
  );
}
