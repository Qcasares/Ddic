import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useDataQuality } from '@/hooks/use-data-quality';
import { formatViolationMessage } from '@/lib/quality-management';
import type { QualityViolation } from '@/lib/quality-management';
import { useToast } from '@/hooks/use-toast';

interface DataQualityViolationsProps {
  dictionaryId: string;
}

export function DataQualityViolations({ dictionaryId }: DataQualityViolationsProps) {
  const { 
    violations, 
    isLoading, 
    resolveViolation 
  } = useDataQuality({ dictionaryId });
  const { toast } = useToast();

  const [processingViolations, setProcessingViolations] = React.useState<Set<string>>(new Set());

  const handleResolveViolation = async (violationId: string) => {
    try {
      setProcessingViolations(prev => new Set(prev).add(violationId));
      await resolveViolation(violationId);
    } finally {
      setProcessingViolations(prev => {
        const next = new Set(prev);
        next.delete(violationId);
        return next;
      });
    }
  };

  const getSeverityBadgeVariant = (severity: QualityViolation['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
    }
  };

  // Demonstrate usage of formatViolationMessage by logging and showing toast
  React.useEffect(() => {
    if (violations.length > 0) {
      const violationDetails = violations.map(violation => 
        formatViolationMessage(violation)
      );
      
      console.log('Current Violations:', violationDetails);
      
      toast({
        title: 'Data Quality Violations',
        description: `${violations.length} violation(s) detected`,
        variant: 'destructive',
      });
    }
  }, [violations, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">No Data Quality Violations</h3>
        <p className="text-sm text-muted-foreground">
          All dictionary entries meet the defined quality rules.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Quality Violations</CardTitle>
        <CardDescription>
          Review and resolve data quality issues in your dictionary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.map((violation) => (
              <TableRow key={violation.id}>
                <TableCell>
                  <Badge variant={getSeverityBadgeVariant(violation.severity)}>
                    {violation.severity.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{violation.field}</TableCell>
                <TableCell>{violation.message}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveViolation(violation.id || '')}
                    disabled={processingViolations.has(violation.id || '')}
                  >
                    {processingViolations.has(violation.id || '') ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      'Resolve'
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}