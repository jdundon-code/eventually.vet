// ============================================================================
// EVENTUALLY.VET - Buddy Letter Service
// Generates VA-compliant buddy/lay statement templates, handles email
// workflow, and tracks letter status through the pipeline
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import { database } from './database';
import { generateId } from '../utils/uuid';
import { getNowISO, formatDate } from '../utils/dates';
import {
  UserProfile,
  ServiceCondition,
  Deployment,
  DutyStation,
} from '../models/types';

// ============================================================================
// TYPES
// ============================================================================

export type BuddyLetterStatus = 'draft' | 'sent' | 'received' | 'attached';

export interface BuddyLetter {
  id: string;
  userId: string;
  conditionId: string;
  conditionName: string;
  buddyName: string;
  buddyEmail: string;
  buddyRelationship: string; // "fellow squad member", "supervisor", "roommate"
  buddyRank?: string;
  buddyBranch?: string;
  sharedDutyStationId?: string;
  sharedDeploymentId?: string;
  status: BuddyLetterStatus;
  customPrompts: string[]; // Additional questions for the buddy
  generatedHtml: string; // The HTML template generated
  sentAt?: string;
  receivedAt?: string;
  attachedAt?: string;
  returnedFileUri?: string; // Path to the returned signed letter
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class BuddyLetterService {
  // =========================================================================
  // LETTER GENERATION
  // =========================================================================

  /**
   * Generate a buddy letter HTML template for a specific condition
   */
  async generateLetter(params: {
    condition: ServiceCondition;
    profile: UserProfile;
    buddyName: string;
    buddyEmail: string;
    buddyRelationship: string;
    buddyRank?: string;
    sharedDutyStation?: DutyStation;
    sharedDeployment?: Deployment;
    customPrompts?: string[];
  }): Promise<BuddyLetter> {
    const {
      condition,
      profile,
      buddyName,
      buddyEmail,
      buddyRelationship,
      buddyRank,
      sharedDutyStation,
      sharedDeployment,
      customPrompts = [],
    } = params;

    const html = this.buildLetterHtml({
      veteranName: `${profile.firstName} ${profile.lastName}`,
      veteranRank: profile.rank || '',
      veteranBranch: profile.branch,
      conditionName: condition.name,
      conditionDescription: condition.description,
      onsetDate: condition.onsetDate,
      buddyName,
      buddyRank,
      buddyRelationship,
      dutyStation: sharedDutyStation,
      deployment: sharedDeployment,
      customPrompts,
    });

    const letter: BuddyLetter = {
      id: generateId(),
      userId: profile.id,
      conditionId: condition.id,
      conditionName: condition.name,
      buddyName,
      buddyEmail,
      buddyRelationship,
      buddyRank,
      sharedDutyStationId: sharedDutyStation?.id,
      sharedDeploymentId: sharedDeployment?.id,
      status: 'draft',
      customPrompts,
      generatedHtml: html,
      notes: '',
      createdAt: getNowISO(),
      updatedAt: getNowISO(),
    };

    // Save to local database
    await this.saveLetter(letter);

    return letter;
  }

  /**
   * Build the HTML for the buddy letter template
   */
  private buildLetterHtml(params: {
    veteranName: string;
    veteranRank: string;
    veteranBranch: string;
    conditionName: string;
    conditionDescription: string;
    onsetDate?: string;
    buddyName: string;
    buddyRank?: string;
    buddyRelationship: string;
    dutyStation?: DutyStation;
    deployment?: Deployment;
    customPrompts: string[];
  }): string {
    const {
      veteranName,
      veteranRank,
      veteranBranch,
      conditionName,
      conditionDescription,
      onsetDate,
      buddyName,
      buddyRank,
      buddyRelationship,
      dutyStation,
      deployment,
      customPrompts,
    } = params;

    const today = formatDate(getNowISO());
    const rankPrefix = buddyRank ? `${buddyRank} ` : '';
    const veteranRankPrefix = veteranRank ? `${veteranRank} ` : '';

    // Build context section
    let contextSection = '';
    if (dutyStation) {
      contextSection += `
        <p>We served together at <strong>${dutyStation.name}</strong> (${dutyStation.location}), 
        assigned to <strong>${dutyStation.unit}</strong>, from 
        ${formatDate(dutyStation.startDate)}${dutyStation.endDate ? ` to ${formatDate(dutyStation.endDate)}` : ' to present'}.</p>
      `;
    }
    if (deployment) {
      contextSection += `
        <p>We were deployed together during <strong>${deployment.name}</strong> to 
        ${deployment.location}${deployment.specificLocation ? ` (${deployment.specificLocation})` : ''}, from 
        ${formatDate(deployment.startDate)}${deployment.endDate ? ` to ${formatDate(deployment.endDate)}` : ''}.</p>
      `;
    }

    // Build prompts section
    const defaultPrompts = [
      `Describe what you personally observed regarding ${veteranRankPrefix}${veteranName}'s condition (${conditionName}). When did you first notice symptoms?`,
      `How did this condition affect their ability to perform their military duties?`,
      `Describe any specific incidents or events you witnessed that are relevant to this condition.`,
      `How often did you observe these symptoms? Were they constant, intermittent, or worsening over time?`,
      `Did ${veteranRankPrefix}${veteranName} seek medical treatment that you are aware of? Did they express pain or limitations to you?`,
    ];

    const allPrompts = [...defaultPrompts, ...customPrompts];
    const promptsHtml = allPrompts
      .map(
        (prompt, i) => `
        <div class="prompt-section">
          <p class="prompt-label">${i + 1}. ${prompt}</p>
          <div class="answer-area">
            <p class="fill-instruction">[Please provide your detailed answer here]</p>
            <br><br><br><br><br>
          </div>
        </div>
      `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 1in;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: 2pt solid #000;
      padding-bottom: 12pt;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0;
    }
    .header h2 {
      font-size: 13pt;
      font-weight: normal;
      margin: 4pt 0 0 0;
      color: #333;
    }
    .legal-notice {
      background: #f5f5f5;
      border: 1px solid #ccc;
      padding: 12pt;
      margin-bottom: 18pt;
      font-size: 10pt;
    }
    .legal-notice strong {
      color: #c00;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1pt solid #999;
      padding-bottom: 4pt;
      margin-top: 24pt;
      margin-bottom: 12pt;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 6pt 12pt;
      margin-bottom: 18pt;
    }
    .info-label {
      font-weight: bold;
      font-size: 11pt;
    }
    .info-value {
      font-size: 11pt;
    }
    .prompt-section {
      margin-bottom: 18pt;
      page-break-inside: avoid;
    }
    .prompt-label {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 6pt;
    }
    .answer-area {
      border: 1px solid #ccc;
      min-height: 100pt;
      padding: 8pt;
      background: #fafafa;
    }
    .fill-instruction {
      color: #999;
      font-style: italic;
      font-size: 10pt;
    }
    .certification {
      margin-top: 36pt;
      border-top: 2pt solid #000;
      padding-top: 18pt;
    }
    .certification p {
      font-size: 11pt;
    }
    .signature-block {
      margin-top: 36pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24pt;
    }
    .sig-line {
      border-bottom: 1pt solid #000;
      min-height: 30pt;
      margin-bottom: 4pt;
    }
    .sig-label {
      font-size: 10pt;
      color: #666;
    }
    .footer {
      margin-top: 48pt;
      font-size: 9pt;
      color: #666;
      text-align: center;
      border-top: 1pt solid #ccc;
      padding-top: 8pt;
    }
    @media print {
      body { margin: 0.75in; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Buddy / Lay Statement</h1>
    <h2>In Support of VA Disability Compensation Claim</h2>
  </div>

  <div class="legal-notice">
    <strong>IMPORTANT:</strong> This statement is being provided in support of a VA disability claim. 
    Please answer all questions honestly and to the best of your recollection. Your statement may be 
    used as evidence in a VA disability claim. You are signing under penalty of perjury that the 
    information provided is true and correct to the best of your knowledge and belief.
  </div>

  <div class="section-title">Statement Provider Information</div>
  <div class="info-grid">
    <span class="info-label">Your Full Name:</span>
    <span class="info-value">${rankPrefix}${buddyName}</span>
    <span class="info-label">Relationship:</span>
    <span class="info-value">${buddyRelationship}</span>
    <span class="info-label">Date of Statement:</span>
    <span class="info-value">${today}</span>
  </div>

  <div class="section-title">Veteran Information</div>
  <div class="info-grid">
    <span class="info-label">Veteran's Name:</span>
    <span class="info-value">${veteranRankPrefix}${veteranName}</span>
    <span class="info-label">Branch of Service:</span>
    <span class="info-value">${veteranBranch.replace('_', ' ').toUpperCase()}</span>
    <span class="info-label">Condition Claimed:</span>
    <span class="info-value">${conditionName}</span>
    ${onsetDate ? `<span class="info-label">Approximate Onset:</span><span class="info-value">${formatDate(onsetDate)}</span>` : ''}
  </div>

  <div class="section-title">Service Connection</div>
  ${contextSection || '<p>[Please describe how you know the veteran and when/where you served together]</p>'}

  <div class="section-title">Your Observations</div>
  <p>Please answer the following questions in as much detail as possible. Specific dates, locations, 
  and descriptions are most helpful for the VA claim.</p>
  
  ${promptsHtml}

  <div class="section-title">Additional Information</div>
  <div class="answer-area" style="min-height: 80pt;">
    <p class="fill-instruction">[Provide any additional information you believe is relevant to this claim]</p>
    <br><br><br>
  </div>

  <div class="certification">
    <p>I, <strong>${rankPrefix}${buddyName}</strong>, hereby certify that the statements made herein 
    are true and correct to the best of my knowledge and belief. I understand that willfully making 
    a false statement or concealing a material fact is a punishable offense under federal law 
    (18 U.S.C. § 1001).</p>

    <div class="signature-block">
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Phone Number</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Email Address</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Generated by EVENTUALLY.VET — This document template is not legal advice. 
    Consult with a VSO or attorney for claim-specific guidance.
  </div>
</body>
</html>
    `;
  }

  // =========================================================================
  // PDF GENERATION & SHARING
  // =========================================================================

  /**
   * Generate a PDF from the letter HTML and return the file URI
   */
  async generatePdf(letter: BuddyLetter): Promise<string> {
    const { uri } = await Print.printToFileAsync({
      html: letter.generatedHtml,
      base64: false,
    });
    return uri;
  }

  /**
   * Share the generated PDF via the system share sheet
   */
  async sharePdf(letter: BuddyLetter): Promise<void> {
    const pdfUri = await this.generatePdf(letter);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Buddy Statement - ${letter.conditionName}`,
        UTI: 'com.adobe.pdf',
      });
    }
  }

  /**
   * Send the buddy letter via email
   */
  async sendViaEmail(letter: BuddyLetter, profile: UserProfile): Promise<boolean> {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      return false;
    }

    // Generate PDF for attachment
    const pdfUri = await this.generatePdf(letter);

    const subject = `Request for Buddy Statement — ${profile.firstName} ${profile.lastName} VA Claim`;
    const body = this.buildEmailBody(letter, profile);

    await MailComposer.composeAsync({
      recipients: [letter.buddyEmail],
      subject,
      body,
      isHtml: true,
      attachments: [pdfUri],
    });

    // Update status to sent
    letter.status = 'sent';
    letter.sentAt = getNowISO();
    letter.updatedAt = getNowISO();
    await this.saveLetter(letter);

    return true;
  }

  /**
   * Build the email body for the buddy letter request
   */
  private buildEmailBody(letter: BuddyLetter, profile: UserProfile): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Buddy Statement Request</h2>
        
        <p>Hi ${letter.buddyName},</p>
        
        <p>${profile.firstName} ${profile.lastName} is preparing a VA disability claim and is requesting 
        your help with a buddy/lay statement regarding: <strong>${letter.conditionName}</strong></p>
        
        <p>As someone who served with ${profile.firstName}, your firsthand observations carry significant 
        weight with the VA. This statement helps establish that the claimed condition is connected to 
        military service.</p>
        
        <h3 style="color: #555;">What to do:</h3>
        <ol>
          <li>Open the attached PDF document</li>
          <li>Answer each question in your own words (be specific — dates, locations, and details help)</li>
          <li>Sign and date the statement</li>
          <li>Return the completed document by replying to this email or sending to: ${profile.firstName}</li>
        </ol>
        
        <h3 style="color: #555;">Tips:</h3>
        <ul>
          <li>Be specific about what you <em>personally observed</em></li>
          <li>Include approximate dates and locations when possible</li>
          <li>Describe how the condition affected their duties</li>
          <li>You can type your answers or print, handwrite, and scan</li>
          <li>Your statement is confidential and only used for the VA claim</li>
        </ul>
        
        <p style="background: #f0f0f0; padding: 12px; border-radius: 4px;">
          <strong>Deadline:</strong> If possible, please return within 2-3 weeks. 
          There's no strict deadline, but sooner helps keep the claim moving.
        </p>
        
        <p>Thank you for taking the time. Your support means a lot.</p>
        
        <p>— ${profile.firstName} ${profile.lastName}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
        <p style="font-size: 11px; color: #999;">
          This request was generated via EVENTUALLY.VET, a personal record-keeping tool for 
          military service members and veterans. Not affiliated with the VA or DoD.
        </p>
      </div>
    `;
  }

  // =========================================================================
  // STATUS MANAGEMENT
  // =========================================================================

  /**
   * Mark a letter as received (buddy returned the completed statement)
   */
  async markReceived(letterId: string, fileUri?: string): Promise<void> {
    const letters = await this.getLetters();
    const letter = letters.find((l) => l.id === letterId);
    if (!letter) return;

    letter.status = 'received';
    letter.receivedAt = getNowISO();
    letter.updatedAt = getNowISO();
    if (fileUri) {
      letter.returnedFileUri = fileUri;
    }
    await this.saveLetter(letter);
  }

  /**
   * Mark a letter as attached to the condition
   */
  async markAttached(letterId: string): Promise<void> {
    const letters = await this.getLetters();
    const letter = letters.find((l) => l.id === letterId);
    if (!letter) return;

    letter.status = 'attached';
    letter.attachedAt = getNowISO();
    letter.updatedAt = getNowISO();
    await this.saveLetter(letter);

    // Also create an attachment record for the condition
    if (letter.returnedFileUri) {
      const fileInfo = await FileSystem.getInfoAsync(letter.returnedFileUri);
      await database.saveAttachment({
        id: generateId(),
        parentId: letter.conditionId,
        parentType: 'condition',
        fileName: `Buddy_Statement_${letter.buddyName.replace(/\s+/g, '_')}.pdf`,
        fileUri: letter.returnedFileUri,
        fileType: 'application/pdf',
        fileSize: fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0,
        description: `Buddy statement from ${letter.buddyName} regarding ${letter.conditionName}`,
        createdAt: getNowISO(),
      });
    }
  }

  // =========================================================================
  // PERSISTENCE (using app_settings as a simple store)
  // =========================================================================

  async saveLetter(letter: BuddyLetter): Promise<void> {
    const letters = await this.getLetters();
    const index = letters.findIndex((l) => l.id === letter.id);
    if (index >= 0) {
      letters[index] = letter;
    } else {
      letters.push(letter);
    }
    await database.setSetting('buddy_letters', JSON.stringify(letters));
  }

  async getLetters(): Promise<BuddyLetter[]> {
    const data = await database.getSetting('buddy_letters');
    if (!data) return [];
    try {
      return JSON.parse(data) as BuddyLetter[];
    } catch {
      return [];
    }
  }

  async getLettersForCondition(conditionId: string): Promise<BuddyLetter[]> {
    const all = await this.getLetters();
    return all.filter((l) => l.conditionId === conditionId);
  }

  async deleteLetter(letterId: string): Promise<void> {
    const letters = await this.getLetters();
    const filtered = letters.filter((l) => l.id !== letterId);
    await database.setSetting('buddy_letters', JSON.stringify(filtered));
  }

  /**
   * Get summary stats for buddy letters
   */
  async getStats(): Promise<{ total: number; draft: number; sent: number; received: number; attached: number }> {
    const letters = await this.getLetters();
    return {
      total: letters.length,
      draft: letters.filter((l) => l.status === 'draft').length,
      sent: letters.filter((l) => l.status === 'sent').length,
      received: letters.filter((l) => l.status === 'received').length,
      attached: letters.filter((l) => l.status === 'attached').length,
    };
  }
}

export const buddyLetterService = new BuddyLetterService();
