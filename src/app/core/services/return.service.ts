import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import { ReturnResponse, CreateReturnRequest, ReturnDecisionRequest, ReturnStatus } from '../models/return.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ReturnService {
  constructor(private apiService: ApiService) {}

  createReturn(data: CreateReturnRequest): Observable<ApiResponse<ReturnResponse>> {
    return this.apiService.post('/returns', data);
  }

  getMyReturns(page = 0, size = 10): Observable<ApiResponse<PageResponse<ReturnResponse>>> {
    return this.apiService.get('/returns/my', { page, size });
  }

  // Admin/Manager
  getAllReturns(status?: ReturnStatus, page = 0, size = 10): Observable<ApiResponse<PageResponse<ReturnResponse>>> {
    const params: any = { page, size };
    if (status) params['status'] = status;
    return this.apiService.get('/returns', params);
  }

  processDecision(id: number, data: ReturnDecisionRequest): Observable<ApiResponse<ReturnResponse>> {
    return this.apiService.patch(`/returns/${id}/decision`, data);
  }
}
