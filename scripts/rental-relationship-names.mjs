// Names from the supplied DA# model (SHA-256 below); six extra roles are
// presentation labels for the actual V11/V12 FK columns, not source names.
export const rentalModelSha256='00c3385b8f23190f32b1b0affdd75adde5fff1c98f6e285f423a1b6ce5fb5273';
export const rentalRelationshipNames={
  'common_code.code_group_id':['분류한다','DAMX',268215],
  'rental_item.business_id':['관리한다','DAMX',267583],
  'rental_contract.member_id':['신청한다','DAMX',264407],
  'rental_contract.item_id':['계약대상이 된다','DAMX',263135],
  'condition_record.contract_id':['기록한다','DAMX',262503],
  'condition_photo.condition_id':['첨부한다','DAMX',270749],
  'damage_observation.condition_id':['기록한다','DAMX',265039],
  'damage_photo.damage_id':['증거사진을 지정한다','DAMX',269481],
  'damage_photo.photo_id':['증거로 사용된다','DAMX',271381],
  'image_analysis_result.photo_id':['분석된다','DAMX',263775],
  'return_inspection.contract_id':['검수받는다','DAMX',268847],
  'return_inspection.intake_condition_id':['인수기준이 된다','DAMX',265671],
  'return_inspection.return_condition_id':['반납대상이 된다','DAMX',266311],
  'return_inspection.inspector_member_id':['검수 담당자 지정','SQL_ROLE'],
  'damage_assessment.inspection_id':['판정한다','DAMX',266951],
  'damage_assessment.return_damage_id':['반납 손상 연결','SQL_ROLE'],
  'damage_assessment.intake_damage_id':['인수 손상 연결','SQL_ROLE'],
  'member_credential.member_id':['회원 인증 연결','SQL_ROLE'],
  'legacy_import_run.imported_by':['이전 실행자 기록','SQL_ROLE'],
  'legacy_entity_map.import_run_id':['이전 실행 연결','SQL_ROLE'],
};
