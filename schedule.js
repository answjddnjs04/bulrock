document.addEventListener('DOMContentLoaded', () => {
    // localStorage에서 tripsData 로드
    function loadTripsData() {
        const trips = JSON.parse(localStorage.getItem('tripsData')) || {
            1: {
                name: '제주도 여행',
                startDate: '2025-05-01',
                endDate: '2025-05-03'
            },
            2: {
                name: '부산 여행',
                startDate: '2025-06-10',
                endDate: '2025-06-12'
            }
        };

        const tripsData = JSON.parse(localStorage.getItem('tripsScheduleData')) || {
            1: {
                name: '제주도 여행',
                scheduleItems: {
                    1: {
                        name: '1일차',
                        items: [
                            { id: 'breakfast', name: '아침', startTime: { hour: 8, minute: 0 }, duration: { hour: 1, minute: 0 }, blockId: 'block2' },
                            { id: 'lunch', name: '점심', startTime: { hour: 12, minute: 0 }, duration: { hour: 1, minute: 0 }, blockId: null },
                            { id: 'dinner', name: '저녁', startTime: { hour: 18, minute: 0 }, duration: { hour: 1, minute: 0 }, blockId: null },
                        ]
                    }
                },
                dayCount: 1,
                dayDisabledSettings: { 1: [] }
            },
            2: {
                name: '부산 여행',
                scheduleItems: {
                    1: {
                        name: '1일차',
                        items: []
                    }
                },
                dayCount: 1,
                dayDisabledSettings: { 1: [] }
            }
        };

        // tripsData와 trips 동기화
        Object.keys(trips).forEach(tripId => {
            if (!tripsData[tripId]) {
                tripsData[tripId] = {
                    name: trips[tripId].name,
                    scheduleItems: {
                        1: {
                            name: '1일차',
                            items: []
                        }
                    },
                    dayCount: 1,
                    dayDisabledSettings: { 1: [] }
                };
            }
        });

        return tripsData;
    }

    // URL에서 tripId 파라미터 읽기
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId') || '1'; // 기본값으로 첫 번째 여행 선택

    // tripsData 로드
    let tripsData = loadTripsData();

    // 현재 선택된 여행의 데이터 로드
    let scheduleItems = tripsData[tripId].scheduleItems;
    let dayCount = tripsData[tripId].dayCount;
    let dayDisabledSettings = tripsData[tripId].dayDisabledSettings;
    let currentDays = [1]; // 현재 표시 중인 일차 배열 (기본값: 1일차)
    let currentCategory = 'all'; // 현재 선택된 카테고리 추적
    let isDragging = false; // 드래그 상태 추적

    const tabs = document.querySelectorAll('.tab');
    const blocks = document.querySelectorAll('.block');
    const searchInput = document.getElementById('block-search');

    // tripsData 업데이트 시 localStorage에 저장
    function saveTripsData() {
        localStorage.setItem('tripsScheduleData', JSON.stringify(tripsData));
    }

    // tripsUpdated 이벤트 리스너 추가
    window.addEventListener('tripsUpdated', () => {
        tripsData = loadTripsData();
        scheduleItems = tripsData[tripId].scheduleItems;
        dayCount = tripsData[tripId].dayCount;
        dayDisabledSettings = tripsData[tripId].dayDisabledSettings;
    });

    // 탭 필터링 로직
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.getAttribute('data-category');
            filterBlocks(); // 탭 변경 시 블럭 필터링
        });
    });

    // 검색어 입력 시 블럭 필터링
    searchInput.addEventListener('input', () => {
        filterBlocks();
    });

    // 블럭 필터링 함수 (카테고리와 검색어 모두 고려)
    function filterBlocks() {
        const searchTerm = searchInput.value.toLowerCase();
        blocks.forEach(block => {
            const category = block.getAttribute('data-category');
            const name = block.querySelector('h3').textContent.toLowerCase();
            const hashtag = block.querySelector('.hashtag').textContent.toLowerCase();

            // 카테고리 필터링
            const matchesCategory = currentCategory === 'all' || category === currentCategory;

            // 검색어 필터링
            const matchesSearch = name.includes(searchTerm) || hashtag.includes(searchTerm);

            // 카테고리와 검색어 모두 만족해야 표시
            if (matchesCategory && matchesSearch) {
                block.style.display = 'block';
            } else {
                block.style.display = 'none';
            }
        });
    }

    // 블록 목록 크기 조정 함수
    function adjustBlockListWidth() {
        const blockList = document.querySelector('.block-list');
        // 드래그 중이거나 두 일차가 표시 중일 때 compressed 클래스 추가
        if (isDragging || currentDays.length >= 2) {
            blockList.classList.add('compressed'); // 두 일차일 때 크기 축소
        } else {
            blockList.classList.remove('compressed'); // 한 일차일 때 원래 크기
        }
    }

    // 일정 짜기 영역 크기 조정 함수
    function adjustDayWrapperWidth() {
        const dayWrappers = document.querySelectorAll('.day-wrapper');
        dayWrappers.forEach(wrapper => {
            if (currentDays.length >= 2) {
                wrapper.classList.add('split'); // 두 일차일 때 반반 크기
            } else {
                wrapper.classList.remove('split'); // 한 일차일 때 전체 크기
            }
        });
    }

    // 점선 드롭 영역 생성 함수
    function createDashedDropArea() {
        const scheduleItemsContainer = document.getElementById('schedule-items');
        const existingDropArea = document.querySelector('.dashed-drop-area');
        if (existingDropArea) {
            existingDropArea.remove(); // 기존 점선 영역 제거
        }

        // schedule-items 높이 보장
        scheduleItemsContainer.style.minHeight = '400px'; // 최소 높이 설정
        scheduleItemsContainer.style.position = 'relative';

        const dropArea = document.createElement('div');
        dropArea.className = 'dashed-drop-area';
        // 인라인 스타일로 명확히 설정
        dropArea.style.width = '50%';
        dropArea.style.minHeight = '400px'; // 최소 높이 설정
        dropArea.style.border = '3px dashed #4caf50'; // 점선 두께와 색상
        dropArea.style.display = 'flex';
        dropArea.style.alignItems = 'center';
        dropArea.style.justifyContent = 'center';
        dropArea.style.textAlign = 'center';
        dropArea.style.color = '#4caf50';
        dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
        dropArea.style.marginLeft = 'auto';
        dropArea.style.boxSizing = 'border-box';
        dropArea.style.position = 'relative';
        dropArea.innerHTML = '<p>동시에 볼 일차를 여기에 드롭하세요</p>';

        // 디버깅 로그 추가
        console.log('Dashed drop area created:', dropArea);

        // 드롭 이벤트 리스너 추가
        dropArea.addEventListener('dragover', (e) => {
            const data = e.dataTransfer.getData('text/plain');
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'day') {
                    e.preventDefault();
                    dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                    console.log('Dragover on dashed drop area');
                }
            } catch (err) {
                // 블록 드래그 데이터는 무시
            }
        });
        dropArea.addEventListener('dragleave', () => {
            dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
            console.log('Dragleave from dashed drop area');
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            console.log('Dropped on dashed drop area:', data);
            if (data.type === 'day') {
                const dayToAdd = parseInt(data.value);
                if (!currentDays.includes(dayToAdd) && currentDays.length < 2) {
                    currentDays.push(dayToAdd); // 새로운 일차 추가
                    dropArea.remove(); // 점선 영역 제거
                    isDragging = false; // 드래그 상태 해제
                    renderSchedule();
                    renderDayTabs(); // 탭 상태 업데이트
                    adjustBlockListWidth(); // 블록 목록 크기 조정
                    adjustDayWrapperWidth();
                }
            }
            dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
        });

        scheduleItemsContainer.appendChild(dropArea);

        // 현재 일차를 왼쪽 반으로 줄이기
        const daysContainer = document.querySelector('.days-container');
        daysContainer.style.display = 'flex';
        daysContainer.style.width = '100%';
        daysContainer.style.minHeight = '400px'; // 최소 높이 설정
        daysContainer.style.alignItems = 'stretch';
        const dayWrapper = daysContainer.querySelector('.day-wrapper');
        if (dayWrapper) {
            dayWrapper.classList.add('split');
        }

        // 블록 리스트도 두 일차 표시 상태로 조정
        isDragging = true;
        adjustBlockListWidth();
    }

    // 점선 드롭 영역 제거 및 UI 복원 함수
    function removeDashedDropArea() {
        const dropArea = document.querySelector('.dashed-drop-area');
        if (dropArea) {
            dropArea.remove();
        }
        const daysContainer = document.querySelector('.days-container');
        daysContainer.style.display = 'block';
        daysContainer.style.width = '100%';
        daysContainer.style.minHeight = 'auto'; // 복원
        const dayWrapper = daysContainer.querySelector('.day-wrapper');
        if (dayWrapper) {
            dayWrapper.classList.remove('split');
        }

        const scheduleItemsContainer = document.getElementById('schedule-items');
        scheduleItemsContainer.style.minHeight = 'auto'; // 복원

        // 블록 리스트 크기 복원
        isDragging = false;
        adjustBlockListWidth();
    }

    // 일차 탭 렌더링
    function renderDayTabs() {
        const dayTabsContainer = document.querySelector('.day-tabs');
        dayTabsContainer.innerHTML = '';
        for (let i = 1; i <= dayCount; i++) {
            const dayTab = document.createElement('button');
            dayTab.className = `day-tab ${currentDays.includes(i) ? 'active' : ''}`;
            dayTab.textContent = scheduleItems[i].name;
            dayTab.setAttribute('data-day', i);
            dayTab.setAttribute('draggable', 'true'); // 드래그 가능 설정
            dayTab.addEventListener('click', () => {
                if (!dayTab.classList.contains('dragging')) {
                    currentDays = [i]; // 클릭 시 해당 일차만 표시
                    renderSchedule();
                    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                    dayTab.classList.add('active');
                }
            });
            // 드래그 이벤트 추가
            dayTab.addEventListener('dragstart', (e) => {
                dayTab.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'day', value: i }));
                e.dataTransfer.setData('application/x-day-tab', 'true'); // day-tab임을 명시
                const addDayBtn = document.querySelector('.add-day-btn');
                addDayBtn.textContent = '일차 복사';
                // 드래그 시작 시 UI 변경
                if (currentDays.length === 1) { // 현재 한 일차만 표시 중일 때
                    createDashedDropArea();
                }
            });
            dayTab.addEventListener('dragend', () => {
                dayTab.classList.remove('dragging');
                const addDayBtn = document.querySelector('.add-day-btn');
                addDayBtn.textContent = '+';
                // 드래그 종료 시 UI 복원
                removeDashedDropArea();
            });
            dayTabsContainer.appendChild(dayTab);
        }
        const addDayBtn = document.createElement('button');
        addDayBtn.className = 'add-day-btn';
        addDayBtn.textContent = '+';
        addDayBtn.addEventListener('click', () => {
            dayCount++;
            scheduleItems[dayCount] = { name: `${dayCount}일차`, items: [] };
            dayDisabledSettings[dayCount] = []; // 새로운 일차에 대한 비활성화 설정 초기화
            tripsData[tripId].dayCount = dayCount; // 업데이트 저장
            saveTripsData();
            renderDayTabs();
            currentDays = [dayCount]; // 새로운 일차로 전환
            renderSchedule();
            document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
            dayTabsContainer.querySelector(`[data-day="${dayCount}"]`).classList.add('active');
        });
        // 드롭 이벤트 추가
        addDayBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            addDayBtn.classList.add('drag-over');
        });
        addDayBtn.addEventListener('dragleave', () => {
            addDayBtn.classList.remove('drag-over');
        });
        addDayBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 상위 요소의 드롭 이벤트 방지
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'day') {
                const dayToCopy = data.value;
                copyDay(dayToCopy);
            }
            addDayBtn.classList.remove('drag-over');
            addDayBtn.textContent = '+';
        });
        dayTabsContainer.appendChild(addDayBtn);
    }

    // 일차 복사 함수
    function copyDay(dayToCopy) {
        const originalDay = scheduleItems[dayToCopy];
        if (!originalDay) return;

        let baseName = originalDay.name.replace(/\s*\(\d+\)$/, '');
        let copyCount = 0;
        Object.keys(scheduleItems).forEach(day => {
            const dayName = scheduleItems[day].name;
            if (dayName.startsWith(baseName) && (dayName === baseName || dayName.match(new RegExp(`^${baseName}\\s*\\(\\d+\\)$`)))) {
                copyCount++;
            }
        });

        const newDayName = copyCount === 0 ? baseName : `${baseName} (${copyCount})`;
        const newDay = JSON.parse(JSON.stringify(originalDay));
        newDay.name = newDayName;
        newDay.items = newDay.items.map(item => ({
            ...item,
            id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 9)
        }));

        dayCount++;
        scheduleItems[dayCount] = newDay;
        dayDisabledSettings[dayCount] = JSON.parse(JSON.stringify(dayDisabledSettings[dayToCopy] || []));
        tripsData[tripId].dayCount = dayCount;
        tripsData[tripId].scheduleItems = scheduleItems;
        tripsData[tripId].dayDisabledSettings = dayDisabledSettings;
        saveTripsData();

        renderDayTabs();
        currentDays = [dayCount];
        renderSchedule();
        adjustBlockListWidth(); // 블록 목록 크기 조정
        document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-day="${dayCount}"]`).classList.add('active');
    }

    // 스케줄 렌더링
    function renderSchedule() {
        const scheduleItemsContainer = document.getElementById('schedule-items');
        scheduleItemsContainer.innerHTML = '';

        const dayNameInput = document.getElementById('day-name-input');
        // 여러 일차가 표시될 경우 첫 번째 일차의 이름만 표시
        dayNameInput.value = currentDays.length === 1 ? scheduleItems[currentDays[0]].name : "다중 일차";
        dayNameInput.disabled = currentDays.length > 1; // 다중 일차일 경우 입력 비활성화
        dayNameInput.addEventListener('change', (e) => {
            if (currentDays.length === 1) {
                scheduleItems[currentDays[0]].name = e.target.value;
                tripsData[tripId].scheduleItems = scheduleItems;
                saveTripsData();
                renderDayTabs();
            }
        });

        const removeDayBtn = document.getElementById('remove-day-btn');
        if (dayCount > 1 && currentDays.length === 1) {
            removeDayBtn.style.display = 'block';
            removeDayBtn.onclick = () => {
                if (dayCount > 1) {
                    removeDay(currentDays[0]);
                } else {
                    alert('최소 한 개의 일차는 유지해야 합니다.');
                }
            };
        } else {
            removeDayBtn.style.display = 'none';
        }

        // 일차를 가로로 배치하기 위한 컨테이너
        const daysContainer = document.createElement('div');
        daysContainer.className = 'days-container';
        daysContainer.style.display = currentDays.length >= 2 ? 'flex' : 'block'; // 두 일차일 때 flex 레이아웃
        daysContainer.style.alignItems = 'stretch';
        scheduleItemsContainer.appendChild(daysContainer);

        // 각 일차에 대해 렌더링
        currentDays.forEach((day, dayIndex) => {
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'day-wrapper';
            if (currentDays.length >= 2) {
                dayWrapper.classList.add('split'); // 두 일차일 때 반반 크기
            }

            // 일차 헤더 추가
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.setAttribute('data-day', day); // 일차 정보 추가
            dayHeader.innerHTML = `<h2>${scheduleItems[day].name}</h2>`;
            dayWrapper.appendChild(dayHeader);

            const firstAddBtn = document.createElement('button');
            firstAddBtn.className = 'add-btn';
            firstAddBtn.textContent = '+';
            firstAddBtn.addEventListener('click', () => showAddForm(firstAddBtn, day));
            dayWrapper.appendChild(firstAddBtn);

            (scheduleItems[day].items || []).forEach((item) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'schedule-item';
                itemElement.id = `day-${day}-${item.id}`; // 고유 ID 부여

                const startTimeStr = `${item.startTime.hour.toString().padStart(2, '0')}:${item.startTime.minute.toString().padStart(2, '0')}`;
                let endTimeStr = '알 수 없음';
                if (item.duration) {
                    let endHour = item.startTime.hour + item.duration.hour;
                    let endMinute = item.startTime.minute + item.duration.minute;
                    if (endMinute >= 60) {
                        endHour += Math.floor(endMinute / 60);
                        endMinute %= 60;
                    }
                    if (endHour >= 24) endHour %= 24;
                    endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                }

                itemElement.innerHTML = `
                    <h3>${item.name} (${startTimeStr} - ${endTimeStr})</h3>
                    <div class="drop-area" data-id="${item.id}" data-day="${day}"></div>
                    <button class="remove-btn" data-id="${item.id}" data-day="${day}">제거</button>
                `;
                dayWrapper.appendChild(itemElement);

                if (item.blockId) {
                    const block = document.getElementById(item.blockId);
                    if (block) {
                        const dropArea = itemElement.querySelector('.drop-area');
                        dropArea.innerHTML = '';
                        const clonedBlock = block.cloneNode(true);
                        clonedBlock.style.opacity = '1';
                        clonedBlock.style.display = 'flex';
                        clonedBlock.style.justifyContent = 'flex-start';
                        clonedBlock.removeAttribute('draggable');
                        clonedBlock.addEventListener('click', () => {
                            clonedBlock.remove();
                            item.blockId = null;
                            dropArea.innerHTML = '';
                            tripsData[tripId].scheduleItems = scheduleItems;
                            saveTripsData();
                            renderBlocks();
                        });
                        dropArea.appendChild(clonedBlock);
                    }
                }

                const addBtn = document.createElement('button');
                addBtn.className = 'add-btn';
                addBtn.textContent = '+';
                addBtn.addEventListener('click', () => showAddForm(addBtn, day));
                dayWrapper.appendChild(addBtn);
            });

            daysContainer.appendChild(dayWrapper);
        });

        addDropListeners();
        addRemoveListeners();
        renderBlocks();
        adjustDayWrapperWidth(); // 일정 짜기 영역 크기 조정
    }

    // 일차 제거 함수
    function removeDay(dayToRemove) {
        delete scheduleItems[dayToRemove];
        delete dayDisabledSettings[dayToRemove];
        const newScheduleItems = {};
        const newDayDisabledSettings = {};
        let newDayCount = 0;
        Object.keys(scheduleItems).sort().forEach((key) => {
            newDayCount++;
            newScheduleItems[newDayCount] = scheduleItems[key];
            newDayDisabledSettings[newDayCount] = dayDisabledSettings[key].map(day => {
                const dayNum = parseInt(day);
                return dayNum > parseInt(dayToRemove) ? (dayNum - 1).toString() : dayNum.toString();
            });
        });
        scheduleItems = newScheduleItems;
        dayDisabledSettings = newDayDisabledSettings;
        dayCount = newDayCount;
        tripsData[tripId].scheduleItems = scheduleItems;
        tripsData[tripId].dayCount = dayCount;
        tripsData[tripId].dayDisabledSettings = dayDisabledSettings;
        saveTripsData();
        currentDays = currentDays.filter(d => d !== dayToRemove).map(d => d > dayToRemove ? d - 1 : d);
        if (currentDays.length === 0) currentDays = [1];
        renderDayTabs();
        renderSchedule();
        adjustBlockListWidth(); // 블록 목록 크기 조정
        renderBlocks();
    }

    // 추가 폼 표시
    function showAddForm(button, day) {
        const form = document.getElementById('add-form');
        form.style.display = 'block';
        form.setAttribute('data-day', day); // 추가 폼에 일차 정보 저장
        document.getElementById('submit-btn').onclick = addNewScheduleItem;
        document.getElementById('cancel-btn').onclick = () => {
            form.style.display = 'none';
            resetForm();
        };
    }

    // 드롭 이벤트 리스너 추가
    function addDropListeners() {
        const dropAreas = document.querySelectorAll('.drop-area');
        dropAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                // 드래그 데이터 타입 확인
                if (e.dataTransfer.types.includes('application/x-block')) {
                    e.preventDefault(); // 드롭 가능 표시
                    area.classList.add('over'); // 초록색 점선 스타일 적용
                }
                // day-tab 드래그 및 기타 드래그는 반응하지 않음
            });
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                if (e.dataTransfer.types.includes('application/x-block')) {
                    const blockId = e.dataTransfer.getData('text/plain');
                    const itemId = area.getAttribute('data-id');
                    const day = parseInt(area.getAttribute('data-day'));
                    const item = scheduleItems[day].items.find(item => item.id === itemId);
                    if (item) {
                        item.blockId = blockId;
                        area.innerHTML = '';
                        const block = document.getElementById(blockId);
                        if (block) {
                            const clonedBlock = block.cloneNode(true);
                            clonedBlock.style.opacity = '1';
                            clonedBlock.style.display = 'flex';
                            clonedBlock.style.justifyContent = 'flex-start';
                            clonedBlock.removeAttribute('draggable');
                            clonedBlock.addEventListener('click', () => {
                                clonedBlock.remove();
                                item.blockId = null;
                                dropArea.innerHTML = '';
                                tripsData[tripId].scheduleItems = scheduleItems;
                                saveTripsData();
                                renderBlocks();
                            });
                            area.appendChild(clonedBlock);
                        }
                        tripsData[tripId].scheduleItems = scheduleItems;
                        saveTripsData();
                        renderBlocks();
                    }
                }
                area.classList.remove('over');
            });
            area.addEventListener('dragleave', () => area.classList.remove('over'));
        });
    }

    // 제거 버튼 리스너 추가
    function addRemoveListeners() {
        const removeBtns = document.querySelectorAll('.remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-id');
                const day = parseInt(btn.getAttribute('data-day'));
                scheduleItems[day].items = scheduleItems[day].items.filter(item => item.id !== itemId);
                tripsData[tripId].scheduleItems = scheduleItems;
                saveTripsData();
                renderSchedule();
            });
        });
    }

    // 새 일정 항목 추가
    function addNewScheduleItem() {
        const form = document.getElementById('add-form');
        const day = parseInt(form.getAttribute('data-day'));
        const name = document.getElementById('name-input').value;
        const startHour = parseInt(document.getElementById('start-hour').value);
        const startMinute = parseInt(document.getElementById('start-minute').value);
        const durationHour = parseInt(document.getElementById('duration-hour').value);
        const durationMinute = parseInt(document.getElementById('duration-minute').value);
        const unknownDuration = document.getElementById('unknown-duration').checked;

        if (!name || isNaN(startHour) || isNaN(startMinute)) {
            alert('이름과 시작 시간을 입력해주세요.');
            return;
        }
        if (!unknownDuration && (isNaN(durationHour) || isNaN(durationMinute))) {
            alert('진행 시간을 입력하거나 "몰라"를 선택해주세요.');
            return;
        }

        const newItem = {
            id: 'item-' + Date.now(),
            name: name,
            startTime: { hour: startHour, minute: startMinute },
            duration: unknownDuration ? null : { hour: durationHour, minute: durationMinute },
            blockId: null
        };

        scheduleItems[day].items.push(newItem);
        tripsData[tripId].scheduleItems = scheduleItems;
        saveTripsData();
        renderSchedule();
        document.getElementById('add-form').style.display = 'none';
        resetForm();
    }

    // 폼 초기화
    function resetForm() {
        document.getElementById('name-input').value = '';
        document.getElementById('start-hour').value = '';
        document.getElementById('start-minute').value = '';
        document.getElementById('duration-hour').value = '';
        document.getElementById('duration-minute').value = '';
        document.getElementById('unknown-duration').checked = false;
    }

    // 중복 비활성화 버튼 클릭
    document.getElementById('disable-settings-btn').addEventListener('click', () => {
        const modal = document.getElementById('disable-modal');
        modal.style.display = 'block';
        const optionsContainer = document.getElementById('disable-options');

        // 다중 일차일 경우 첫 번째 일차의 비활성화 설정만 수정 가능
        const currentDay = currentDays[0];
        const currentDisabledDays = dayDisabledSettings[currentDay] || [];

        optionsContainer.innerHTML = Object.keys(scheduleItems)
            .map(day => `
                <label>
                    <input type="checkbox" value="${day}" ${currentDisabledDays.includes(day) ? 'checked' : ''}>
                    ${scheduleItems[day].name} ${day === currentDay.toString() ? '(현재 일정)' : ''}
                </label>
            `).join('');

        document.getElementById('save-disable-btn').onclick = () => {
            dayDisabledSettings[currentDay] = Array.from(optionsContainer.querySelectorAll('input:checked'))
                .map(input => input.value);
            tripsData[tripId].dayDisabledSettings = dayDisabledSettings;
            saveTripsData();
            renderBlocks();
            modal.style.display = 'none';
        };

        document.addEventListener('click', (e) => {
            if (!modal.contains(e.target) && e.target.id !== 'disable-settings-btn') {
                modal.style.display = 'none';
            }
        }, { once: true });
    });

    // 블럭 렌더링
    function renderBlocks() {
        document.querySelectorAll('.block').forEach(block => {
            const blockId = block.id;
            const disabledDays = getDaysForBlock(blockId);
            const currentDisabledDays = dayDisabledSettings[currentDays[0]] || [];
            const shouldDisable = disabledDays.some(day => currentDisabledDays.includes(day));

            const hashtagElement = block.querySelector('.hashtag');
            let baseHashtag = hashtagElement.textContent.replace(/\s*\(.+\)$/, '');

            if (shouldDisable) {
                block.classList.add('disabled');
                block.setAttribute('draggable', 'false');
                const disabledDayNames = [...new Set(disabledDays)]
                    .filter(day => currentDisabledDays.includes(day))
                    .map(day => scheduleItems[day].name)
                    .join(', ');
                hashtagElement.textContent = disabledDayNames ? `${baseHashtag} (${disabledDayNames})` : baseHashtag;
            } else {
                block.classList.remove('disabled');
                block.setAttribute('draggable', 'true');
                hashtagElement.textContent = baseHashtag;
            }
        });
        filterBlocks();
    }

    // 블럭이 속한 모든 일차 찾기
    function getDaysForBlock(blockId) {
        const days = [];
        for (let day in scheduleItems) {
            if (scheduleItems[day].items.some(item => item.blockId === blockId)) {
                days.push(day);
            }
        }
        return [...new Set(days)];
    }

    // 초기 렌더링
    renderDayTabs();
    renderSchedule();
    adjustBlockListWidth(); // 초기 블록 목록 크기 조정

    // 블록 드래그 설정
    blocks.forEach(block => {
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', block.id); // 블록 id 전달
            e.dataTransfer.setData('application/x-block', 'true'); // 블록임을 명시
            block.style.opacity = '0.5';
        });
        block.addEventListener('dragend', () => block.style.opacity = '1');
    });

    blocks.forEach(block => block.style.display = 'block');
});
