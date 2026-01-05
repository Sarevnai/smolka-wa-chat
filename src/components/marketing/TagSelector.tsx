import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useContactTags, 
  useContactTagAssignments,
  useAssignTag,
  useRemoveTag,
  ContactTag 
} from "@/hooks/useContactTags";
import type { Database } from "@/integrations/supabase/types";

type DepartmentType = Database["public"]["Enums"]["department_type"];

interface TagSelectorProps {
  contactId: string;
  departmentCode?: DepartmentType;
  compact?: boolean;
  readOnly?: boolean;
}

export function TagSelector({ 
  contactId, 
  departmentCode = "marketing",
  compact = false,
  readOnly = false
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: allTags = [] } = useContactTags(departmentCode);
  const { data: assignments = [] } = useContactTagAssignments(contactId);
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();

  const assignedTagIds = new Set(assignments.map((a) => a.tag_id));
  const assignedTags = assignments.map((a) => a.tag).filter(Boolean);

  const handleToggleTag = async (tag: ContactTag) => {
    if (assignedTagIds.has(tag.id)) {
      await removeTag.mutateAsync({ contactId, tagId: tag.id });
    } else {
      await assignTag.mutateAsync({ contactId, tagId: tag.id });
    }
  };

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {assignedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
            className="text-xs border"
          >
            {tag.name}
          </Badge>
        ))}
        {assignedTags.length === 0 && (
          <span className="text-xs text-muted-foreground">Sem tags</span>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-1">
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {assignedTags.length > 0 ? (
                assignedTags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
                    className="text-xs border"
                  >
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">+ Tags</span>
              )}
              {assignedTags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{assignedTags.length - 3}
                </Badge>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {allTags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag disponível
                </p>
              ) : (
                allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                    disabled={assignTag.isPending || removeTag.isPending}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    {assignedTagIds.has(tag.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assignedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
            className="text-xs border flex items-center gap-1 pr-1"
          >
            {tag.name}
            <button
              onClick={() => removeTag.mutate({ contactId, tagId: tag.id })}
              className="hover:bg-black/10 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {allTags
                .filter((tag) => !assignedTagIds.has(tag.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      handleToggleTag(tag);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                    disabled={assignTag.isPending}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </button>
                ))}
              {allTags.filter((tag) => !assignedTagIds.has(tag.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Todas as tags já foram adicionadas
                </p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
