import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { 
  CheckCircle2, 
  Circle,
  ArrowRight,
  Sparkles,
  Loader2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SetupProgressBanner() {
  const { steps, loading, progress, isComplete } = useSetupProgress();

  // Don't show if setup is complete
  if (isComplete) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 overflow-hidden">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Header */}
          <div className="flex items-center gap-3 md:min-w-[200px]">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Configure seu sistema</h3>
              <p className="text-xs text-muted-foreground">
                {progress}% concluído
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1">
            <Progress value={progress} className="h-2 bg-muted/50" />
          </div>

          {/* Steps */}
          <div className="flex items-center gap-4 flex-wrap">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  step.completed ? "text-emerald-500" : "text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span className={cn(
                  "hidden sm:inline",
                  step.completed && "line-through"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button asChild size="sm" className="shrink-0">
            <Link to="/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              Configurar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
