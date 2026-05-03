import React, { useState } from 'react';
// import { fetchWords, createWord, updateWord, deleteWord } from '../api'; // 실제 API 연동 시 주석 해제

const WordManagePage = () => {
    // 임시 데이터 (백엔드 연동 전 화면 확인용)
    const [words, setWords] = useState([
        { id: 1, english: 'implement', korean: '실행하다', partOfSpeech: '동사', exampleSentence: 'The company decided to implement a new marketing strategy.' },
        { id: 2, english: 'prominent', korean: '저명한', partOfSpeech: '형용사', exampleSentence: 'She is a prominent researcher in the field of AI.' },
        { id: 3, english: 'unanimous', korean: '만장일치의', partOfSpeech: '형용사', exampleSentence: 'The board reached a unanimous decision.' }
    ]);

    // 모달 상태 관리
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWord, setEditingWord] = useState(null); // 수정할 단어 데이터 (null이면 '추가' 모드)

    // 폼 입력 상태 관리
    const [formData, setFormData] = useState({
        english: '',
        korean: '',
        partOfSpeech: '',
        exampleSentence: ''
    });

    // '+ 새 단어 추가' 버튼 클릭 시 모달 열기
    const handleOpenAdd = () => {
        setEditingWord(null);
        setFormData({ english: '', korean: '', partOfSpeech: '', exampleSentence: '' });
        setIsModalOpen(true);
    };

    // '수정' 버튼 클릭 시 모달 열기 및 기존 데이터 채우기
    const handleOpenEdit = (word) => {
        setEditingWord(word);
        setFormData({
            english: word.english,
            korean: word.korean,
            partOfSpeech: word.partOfSpeech || '',
            exampleSentence: word.exampleSentence || ''
        });
        setIsModalOpen(true);
    };

    // 폼 입력값 변경 핸들러
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // 단어 삭제 처리
    const handleDelete = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            // deleteWord(id).then(() => { ... }) // 실제 API 호출
            setWords(words.filter(word => word.id !== id));
        }
    };

    // 폼 제출 (추가 또는 수정 처리)
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingWord) {
            // [수정] 모드 로직
            // updateWord(editingWord.id, formData).then(() => { ... }) // 실제 API 호출
            const updatedWords = words.map(w => w.id === editingWord.id ? { ...w, ...formData } : w);
            setWords(updatedWords);
        } else {
            // [추가] 모드 로직
            // createWord(formData).then(() => { ... }) // 실제 API 호출
            const newWord = {
                id: Date.now(), // 임시 ID 발급
                ...formData
            };
            setWords([...words, newWord]);
        }

        setIsModalOpen(false); // 처리 후 모달 닫기
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* 왼쪽 사이드바 (다크 테마 적용) */}
            <aside className="w-64 bg-[#1a2332] text-white flex flex-col justify-between">
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-8">L👀kEng</h1>
                    <nav className="space-y-2">
                        <button className="w-full flex items-center px-4 py-3 bg-[#2d3748] rounded-lg text-left">
                            <span className="mr-3">📝</span> 단어장 관리
                        </button>
                        <button className="w-full flex items-center px-4 py-3 hover:bg-white/10 rounded-lg text-left text-gray-400">
                            <span className="mr-3">🎯</span> 단어 퀴즈 세션
                        </button>
                    </nav>
                </div>
                <div className="p-6">
                    <p className="font-semibold mb-2">admin 님</p>
                    <button className="text-sm text-red-400 hover:text-red-300">로그아웃</button>
                </div>
            </aside>

            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold text-gray-800">단어장 관리</h2>
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold">ADMIN</span>
                    </div>
                    {/* 단어 추가 버튼 - handleOpenAdd 연결 */}
                    <button
                        onClick={handleOpenAdd}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-md font-medium transition-colors"
                    >
                        + 새 단어 추가
                    </button>
                </div>

                {/* 단어 리스트 표시 영역 */}
                <div className="space-y-4">
                    {words.map((word) => (
                        <div key={word.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{word.english}</h3>
                                {word.exampleSentence && (
                                    <div className="flex items-start text-gray-500 italic mt-3">
                                        <div className="w-1 h-5 bg-blue-200 mr-3 mt-1"></div>
                                        <p className="text-sm">{word.exampleSentence}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex space-x-4 items-center h-full">
                                {/* 수정 버튼 - handleOpenEdit 연결 */}
                                <button
                                    onClick={() => handleOpenEdit(word)}
                                    className="text-gray-500 hover:text-blue-500 text-sm font-medium transition-colors"
                                >
                                    수정
                                </button>
                                <button
                                    onClick={() => handleDelete(word.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/*  모달 (Modal) 컴포넌트  */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">
                            {editingWord ? '단어 수정하기' : '새 단어 추가'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">영단어 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="english"
                                    value={formData.english}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="예: apple"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">한국어 뜻 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="korean"
                                    value={formData.korean}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="예: 사과"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">품사</label>
                                <input
                                    type="text"
                                    name="partOfSpeech"
                                    value={formData.partOfSpeech}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="예: 명사, 동사"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">예문</label>
                                <textarea
                                    name="exampleSentence"
                                    value={formData.exampleSentence}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                                    placeholder="예문을 입력하세요."
                                ></textarea>
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    {editingWord ? '수정 완료' : '추가하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordManagePage;