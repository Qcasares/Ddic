import { useDataQuality } from '@/hooks/use-data-quality';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface QualityDashboardProps {
  dictionaryId: string;
}

export function QualityDashboard({ dictionaryId }: QualityDashboardProps) {
  const { scores, isLoading, error } = useDataQuality(dictionaryId);

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p>Failed to load quality metrics</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-8 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>
      </Card>
    );
  }

  const averageScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 
    Object.values(scores).length;

  const getQualityLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-500' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-500' };
    return { label: 'Needs Improvement', color: 'text-red-500' };
  };

  const qualityLevel = getQualityLevel(averageScore);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Data Quality Score</h3>
          <div className={`flex items-center gap-2 ${qualityLevel.color}`}>
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{qualityLevel.label}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Score</span>
            <span className="font-medium">{averageScore.toFixed(1)}%</span>
          </div>
          <Progress value={averageScore} className="h-2" />
        </div>

        <div className="grid gap-4">
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Quality Metrics</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Field descriptions: 30%</li>
                <li>• Sample values: 20%</li>
                <li>• Metadata completeness: 20%</li>
                <li>• Validation rules: 30%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}