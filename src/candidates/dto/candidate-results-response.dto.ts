// src/candidates/dto/candidate-results-response.dto.ts
export class ServiceResultResponseDto {
  serviceId: string;
  serviceName: string;
  resultFile: string;
  resultFileName: string;
  resultFileType: string;
  resultFileSize: number;
  resultStatus: 'pass' | 'fail' | 'pending';
  resultAddedAt: Date;
  resultAddedBy: string;
  resultNotes?: string;
}

export class SummaryResultResponseDto {
  resultFile: string;
  resultFileName: string;
  resultFileType: string;
  resultFileSize: number;
  overallStatus: 'pass' | 'fail' | 'pending';
  resultAddedAt: Date;
  resultAddedBy: string;
  resultNotes?: string;
}

export class CandidateResultsResponseDto {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  services: Array<{
    serviceId: string;
    serviceName: string;
    hasResult: boolean;
    result?: ServiceResultResponseDto;
  }>;
  summaryResult?: SummaryResultResponseDto;
  isComplete: boolean;
  completionPercentage: number;
  totalFiles: number;
  completedFiles: number;
}