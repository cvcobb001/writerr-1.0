import { ChatMessage, AIProvider } from '@shared/types';

interface WriterrlChatSettings {
  defaultProvider: string;
  providers: AIProvider[];
  maxTokens: number;
  temperature: number;
}

export class AIProviderManager {
  private settings: WriterrlChatSettings;

  constructor(settings: WriterrlChatSettings) {
    this.settings = settings;
  }

  updateSettings(settings: WriterrlChatSettings) {
    this.settings = settings;
  }

  async sendMessage(messages: ChatMessage[], context?: string): Promise<string> {
    const provider = this.getProvider(this.settings.defaultProvider);
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    if (!provider.apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    // Build the request payload based on provider
    const requestMessages = this.buildRequestMessages(messages, context);
    
    try {
      if (provider.id === 'openai' || provider.baseUrl?.includes('openai')) {
        return await this.sendOpenAIMessage(provider, requestMessages);
      } else if (provider.id === 'anthropic' || provider.baseUrl?.includes('anthropic')) {
        return await this.sendAnthropicMessage(provider, requestMessages);
      } else {
        // Generic OpenAI-compatible API
        return await this.sendOpenAIMessage(provider, requestMessages);
      }
    } catch (error) {
      console.error('AI Provider Error:', error);
      throw new Error(`AI Provider failed: ${error.message}`);
    }
  }

  private buildRequestMessages(messages: ChatMessage[], context?: string): any[] {
    const requestMessages: any[] = [];

    // Add context as system message if provided
    if (context) {
      requestMessages.push({
        role: 'system',
        content: `Here's the current document context:\n\n${context}\n\nPlease use this context to inform your responses.`
      });
    }

    // Convert chat messages to API format
    for (const message of messages) {
      if (message.role !== 'system') {
        requestMessages.push({
          role: message.role,
          content: message.content
        });
      }
    }

    return requestMessages;
  }

  private async sendOpenAIMessage(provider: AIProvider, messages: any[]): Promise<string> {
    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from AI provider');
    }

    return data.choices[0].message.content;
  }

  private async sendAnthropicMessage(provider: AIProvider, messages: any[]): Promise<string> {
    const baseUrl = provider.baseUrl || 'https://api.anthropic.com';
    const url = `${baseUrl}/v1/messages`;

    // Anthropic has a different message format
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        system: systemPrompt,
        messages: conversationMessages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Anthropic API');
    }

    return data.content[0].text;
  }

  private getProvider(providerId: string): AIProvider | undefined {
    return this.settings.providers.find(p => p.id === providerId);
  }

  getProviders(): AIProvider[] {
    return [...this.settings.providers];
  }

  validateProvider(provider: AIProvider): { valid: boolean; error?: string } {
    if (!provider.name || !provider.model) {
      return { valid: false, error: 'Provider name and model are required' };
    }

    if (!provider.apiKey) {
      return { valid: false, error: 'API key is required' };
    }

    // Basic URL validation if baseUrl is provided
    if (provider.baseUrl) {
      try {
        new URL(provider.baseUrl);
      } catch {
        return { valid: false, error: 'Invalid base URL format' };
      }
    }

    return { valid: true };
  }
}