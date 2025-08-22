# Executive Summary Generator

**Function ID**: `business-executive-summary`
**Category**: Business Writing
**Mode**: Executive Communication

## Function Description

This function analyzes lengthy business documents and generates concise, impactful executive summaries that highlight key findings, recommendations, and business implications for senior leadership.

## Usage Examples

### Input Text
```
Our quarterly analysis of the customer service department reveals several important findings. First, customer satisfaction scores have increased from 3.2 to 4.1 over the past six months, primarily due to the implementation of the new chatbot system and additional staff training programs. Second, response times have decreased by 35% from an average of 2.3 hours to 1.5 hours. However, we've also identified challenges including increased complaint complexity and higher staff turnover in the technical support team.

The financial impact has been significant. Customer retention has improved by 12%, translating to approximately $2.3 million in additional revenue. The chatbot implementation cost $450,000 but has already generated $800,000 in labor savings. Staff turnover costs have increased by $150,000 due to recruitment and training expenses.

Moving forward, we recommend expanding the chatbot capabilities, implementing a structured career development program to reduce turnover, and establishing a specialized team for complex technical issues. These initiatives require a budget of $1.2 million but project returns of $3.8 million over the next 18 months.
```

### Expected Output
```
**EXECUTIVE SUMMARY**

**Key Achievements:**
- Customer satisfaction increased 28% (3.2 → 4.1) through chatbot deployment and enhanced training
- Response times improved 35% (2.3 → 1.5 hours average)
- Generated $2.3M additional revenue from improved 12% customer retention

**Financial Impact:**
- Net positive ROI: $2.2M gain ($800K chatbot savings + $2.3M retention revenue - $450K implementation - $150K turnover costs)
- Payback period: 6 months

**Critical Issues:**
- Technical support team turnover requires immediate attention
- Increasing complaint complexity demands specialized resources

**Recommended Actions (Budget: $1.2M | Projected Return: $3.8M):**
1. Expand chatbot capabilities for routine inquiries
2. Launch career development program to reduce turnover
3. Establish dedicated complex technical support team

**Next Steps:**
Board approval required for $1.2M investment by [date] to maintain momentum and achieve projected 18-month ROI of 217%.
```

## Function Configuration

```json
{
  "functionId": "business-executive-summary",
  "name": "Executive Summary Generator",
  "category": "business",
  "mode": "executive-communication",
  "description": "Generates concise executive summaries highlighting key findings, financial impact, and strategic recommendations",
  "parameters": {
    "maxLength": 300,
    "includeFinancials": true,
    "highlightROI": true,
    "includeNextSteps": true,
    "executiveLevel": "C-suite",
    "urgencyIndicator": true
  },
  "prompts": {
    "primary": "Create an executive summary that highlights key achievements, financial impact, critical issues, and recommended actions with specific numbers and timelines.",
    "followUp": "Ensure the summary includes clear ROI calculations and specific next steps with deadlines."
  }
}
```

## Testing Scenarios

### Scenario 1: Financial Analysis Report
**Input**: Detailed quarterly financial analysis (1000+ words)
**Expected**: Concise summary with key metrics, trends, and implications

### Scenario 2: Market Research Report
**Input**: Comprehensive market analysis with multiple data points
**Expected**: Strategic summary focusing on opportunities and threats

### Scenario 3: Project Status Report
**Input**: Detailed project progress report with multiple workstreams
**Expected**: High-level status with critical issues and decisions needed

### Scenario 4: Operational Review
**Input**: Department performance review with metrics and challenges
**Expected**: Summary highlighting performance gaps and improvement plans

## Success Criteria

- [ ] Reduces content length by 80-90% while preserving key information
- [ ] Highlights quantitative results and financial impact
- [ ] Includes specific, actionable recommendations
- [ ] Uses executive-level language and tone
- [ ] Identifies critical decisions and next steps
- [ ] Maintains logical flow and structure
- [ ] Response time under 4 seconds
- [ ] Clearly separates achievements from challenges