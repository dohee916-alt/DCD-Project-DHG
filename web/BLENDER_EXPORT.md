# 승인된 Blender 작업 파일을 웹에 넣기

브라우저는 `.blend`를 직접 읽지 못한다. Blender에서 GLB로 내보낸 뒤 웹에 넣는다. 현재 웹에 들어간 모델은 STL/OBJ 원본으로 다시 만든 임시 GLB이며, 승인된 `.blend`의 재질을 그대로 옮긴 결과가 아니다.

Blender를 사용자가 정상적으로 연 상태에서 **Scripting → Python Console**을 열고 아래 한 줄을 실행한다. 다섯 작업 파일을 읽고 `assets/models/blender-approved/`에 GLB와 `export-status.json`을 남긴다. 원본 `.blend`는 저장하거나 수정하지 않는다.

```python
exec(compile(open('/Users/gweondohee/Documents/Codex/2026-10-25/new-chat/outputs/dcd-web/export_web_3d.py', encoding='utf-8').read(), 'export_web_3d.py', 'exec'))
```

`export-status.json`에서 각 파일의 `ok: true`와 실제 GLB를 확인한 뒤, 다음 한 줄로 웹 미리보기에 넣을 수 있다.

```bash
python3 /Users/gweondohee/Documents/Codex/2026-10-25/new-chat/outputs/dcd-web/embed_blender_exports.py
```

GLB는 메시, UV, 텍스처와 호환되는 PBR 재질을 옮긴다. Blender 전용 절차적 노드, Bump, 조명과 Cycles 렌더 모습은 자동으로 똑같이 옮겨지지 않는다. 특히 블리스터 호일은 높이맵을 normal/roughness/base-color 텍스처로 구워서 GLB와 나란히 렌더 비교해야 한다. 주사기 주입 애니메이션은 내보낸 GLB의 실제 밀대·약물 객체 이름과 좌표를 확인한 뒤 웹 동작에 연결해야 한다. 이 검증 전에는 GLB 교체를 완료로 취급하지 않는다.
