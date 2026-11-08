import { describe, expect, it } from 'vitest';
import {
  reconcileDestinationAccess, type ReconciliationSnapshot,
} from './provisioning-reconciliation';
import type { ProductProvisioningRequest } from './product-provisioning-contract';

const request: ProductProvisioningRequest = {
  requestId: 'r1', centralIdentityId:'central',remoteAuthUserId:'remote',
  companyId:'company',remoteCompanyId:'remote-company',productCode:'COMMANDER7',
  roleCode:'READER',action:'GRANT',
};
const snapshot: ReconciliationSnapshot = {
  centralGrantActive: true, contractActive: true, seatReserved:true,
  connectionVerified:true, identityActive:true, companyActive:true,
  localAuthLinked:true,
  productReceipt:{
    requestId:'r1',remoteAuthUserId:'remote',remoteCompanyId:'remote-company',
    productCode:'COMMANDER7',roleCode:'READER',effective:true,revision:'revision-2026-1',
  },
};
describe('7Service fail-closed reconciliation',()=>{
  it('confirms only exact remote profile and all central gates',()=>{
    expect(reconcileDestinationAccess(request,snapshot)).toEqual({
      state:'CONFIRMED',operation:'NONE',
    });
  });
  it('flags an active remote account for revocation if central access is blocked',()=>{
    expect(reconcileDestinationAccess(request,{...snapshot,seatReserved:false}))
      .toMatchObject({state:'BLOCKED',operation:'REVOKE'});
  });
  it('does not treat Auth identity as a profile entitlement',()=>{
    expect(reconcileDestinationAccess(request,{...snapshot,productReceipt:null}))
      .toMatchObject({state:'PENDING',operation:'APPLY_PROFILE'});
  });
  it('never confirms mismatched company, role or remote user',()=>{
    for(const changed of [
      {remoteCompanyId:'another-company'},
      {roleCode:'ADMIN'},
      {remoteAuthUserId:'different-user'},
    ]) {
      expect(reconcileDestinationAccess(request,{
        ...snapshot,productReceipt:{...snapshot.productReceipt!,...changed},
      }).state).not.toBe('CONFIRMED');
    }
  });
  it('keeps unlinked accounts pending instead of assuming email matching',()=>{
    expect(reconcileDestinationAccess(request,{...snapshot,localAuthLinked:false}))
      .toMatchObject({state:'PENDING',operation:'INVITE'});
  });
  it('does not grant when destination connection is unverified',()=>{
    expect(reconcileDestinationAccess(request,{...snapshot,connectionVerified:false}).state)
      .toBe('BLOCKED');
  });
});
