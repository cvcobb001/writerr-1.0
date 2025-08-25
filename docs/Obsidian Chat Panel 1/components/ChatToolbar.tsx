import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { FileText, Copy, BrushCleaning, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useActiveDocument } from '../App';

interface ModelOption {
  value: string;
  label: string;
  provider: string;
  family: string;
}

interface PromptOption {
  value: string;
  label: string;
  category?: string; // Future expansion for categorization
}

interface ChatToolbarProps {
  onAddDoc: () => void;
  onCopyChat: () => void;
  onClearChat: () => void;
  onModelChange?: (model: string) => void;
  currentModel?: string;
}

export function ChatToolbar({ onAddDoc, onCopyChat, onClearChat, onModelChange, currentModel }: ChatToolbarProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel || 'gpt-4-turbo');
  const [selectedPrompt, setSelectedPrompt] = useState('default');
  const [isConnected, setIsConnected] = useState(true);
  const { activeDocument } = useActiveDocument();

  // Models organized by provider and family
  const models: ModelOption[] = [
    // OpenAI
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', family: 'GPT-4' },
    { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI', family: 'GPT-4' },
    { value: 'gpt-4-vision', label: 'GPT-4 Vision', provider: 'OpenAI', family: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI', family: 'GPT-3.5' },
    { value: 'gpt-3.5-turbo-instruct', label: 'GPT-3.5 Turbo Instruct', provider: 'OpenAI', family: 'GPT-3.5' },
    
    // Anthropic
    { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic', family: 'Claude 3' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', provider: 'Anthropic', family: 'Claude 3' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic', family: 'Claude 3' },
    { value: 'claude-2.1', label: 'Claude 2.1', provider: 'Anthropic', family: 'Claude 2' },
    { value: 'claude-2', label: 'Claude 2', provider: 'Anthropic', family: 'Claude 2' },
    
    // Google
    { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google', family: 'Gemini' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision', provider: 'Google', family: 'Gemini' },
    { value: 'gemini-ultra', label: 'Gemini Ultra', provider: 'Google', family: 'Gemini' },
    
    // Meta
    { value: 'llama-2-70b', label: 'Llama 2 70B', provider: 'Meta', family: 'Llama 2' },
    { value: 'llama-2-13b', label: 'Llama 2 13B', provider: 'Meta', family: 'Llama 2' },
    { value: 'llama-2-7b', label: 'Llama 2 7B', provider: 'Meta', family: 'Llama 2' },
    
    // Mistral
    { value: 'mistral-large', label: 'Mistral Large', provider: 'Mistral', family: 'Mistral' },
    { value: 'mistral-medium', label: 'Mistral Medium', provider: 'Mistral', family: 'Mistral' },
    { value: 'mistral-small', label: 'Mistral Small', provider: 'Mistral', family: 'Mistral' }
  ];

  // Prompts organized alphabetically for now, with future categorization support
  const prompts: PromptOption[] = [
    { value: 'code-reviewer', label: 'Code Reviewer' },
    { value: 'creative-writer', label: 'Creative Writer' },
    { value: 'default', label: 'Default Assistant' },
    { value: 'note-organizer', label: 'Note Organizer' },
    { value: 'research-helper', label: 'Research Helper' }
  ];

  useEffect(() => {
    if (currentModel && currentModel !== selectedModel) {
      setSelectedModel(currentModel);
    }
  }, [currentModel]);

  // Simulate connection status - randomly disconnect occasionally for demo
  useEffect(() => {
    const interval = setInterval(() => {
      // 90% chance to stay connected, 10% chance to disconnect temporarily
      if (Math.random() < 0.1) {
        setIsConnected(false);
        // Reconnect after 2-5 seconds
        setTimeout(() => setIsConnected(true), 2000 + Math.random() * 3000);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onModelChange?.(model);
  };

  // Get the display label for the selected model
  const getSelectedModelLabel = () => {
    const model = models.find(m => m.value === selectedModel);
    return model ? model.label : selectedModel;
  };

  // Group models by provider and family
  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = {};
    }
    if (!acc[model.provider][model.family]) {
      acc[model.provider][model.family] = [];
    }
    acc[model.provider][model.family].push(model);
    return acc;
  }, {} as Record<string, Record<string, ModelOption[]>>);

  // Future: Function to organize prompts by category
  const organizePrompts = (prompts: PromptOption[]): PromptOption[] => {
    // Currently just alphabetical, but ready for future categorization
    return prompts.sort((a, b) => a.label.localeCompare(b.label));
  };

  const organizedPrompts = organizePrompts(prompts);

  const handleAddDoc = () => {
    if (activeDocument) {
      toast.success(`${activeDocument.name} added to chat`);
    } else {
      toast.info('No active document to add');
    }
    onAddDoc();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between p-3">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddDoc}
                disabled={!activeDocument}
                className="size-8"
              >
                <FileText className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {activeDocument 
                  ? `Add ${activeDocument.name} to chat` 
                  : 'No active document'
                }
              </p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCopyChat}
                className="size-8"
              >
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy chat</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearChat}
                className="size-8"
              >
                <BrushCleaning className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear chat</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Dropdowns - removed labels and backgrounds */}
        <div className="flex items-center gap-3">
          {/* Model Status Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <div className={`size-2 rounded-full ${
                  selectedModel && isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {!selectedModel 
                  ? 'No model selected' 
                  : !isConnected 
                    ? 'Disconnected' 
                    : 'Connected'
                }
              </p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="border-none bg-transparent w-36 h-8 hover:bg-transparent focus:ring-0 focus:ring-offset-0 justify-between font-normal"
              >
                <span className="truncate">{getSelectedModelLabel()}</span>
                <ChevronDown className="size-4 ml-2 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
              {Object.entries(groupedModels).map(([provider, families]) => (
                <div key={provider}>
                  {Object.entries(families).map(([family, familyModels]) => (
                    <DropdownMenuSub key={`${provider}-${family}`}>
                      <DropdownMenuSubTrigger>
                        <span>{provider} {family}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {familyModels.map((model) => (
                          <DropdownMenuItem
                            key={model.value}
                            onClick={() => handleModelChange(model.value)}
                            className="flex items-center justify-between"
                          >
                            <span>{model.label}</span>
                            {selectedModel === model.value && <Check className="size-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ))}
                  {/* Add separator between providers except for the last one */}
                  {provider !== Object.keys(groupedModels)[Object.keys(groupedModels).length - 1] && (
                    <DropdownMenuSeparator />
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
            <SelectTrigger className="border-none bg-transparent w-40 h-8 hover:bg-transparent focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {organizedPrompts.map((prompt) => (
                <SelectItem key={prompt.value} value={prompt.value}>
                  {prompt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  );
}