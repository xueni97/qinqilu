// 亲戚录入预设选项
// 设计原则：常见值让用户勾选，避免自由输入导致不一致难筛选
// 关系按辈分组织，分支覆盖常见家族，特征按类别组织

// 常见关系（按辈分）
// 用法：根据所选辈分，显示该辈分对应的关系选项
export const RELATIONSHIP_PRESETS = {
  1: [  // 祖辈
    { text: '祖父', value: '祖父' },
    { text: '祖母', value: '祖母' },
    { text: '外祖父', value: '外祖父' },
    { text: '外祖母', value: '外祖母' }
  ],
  2: [  // 父辈
    { text: '父亲', value: '父亲' },
    { text: '母亲', value: '母亲' },
    { text: '伯父', value: '伯父' },
    { text: '伯母', value: '伯母' },
    { text: '叔父', value: '叔父' },
    { text: '婶母', value: '婶母' },
    { text: '姑母', value: '姑母' },
    { text: '姑父', value: '姑父' },
    { text: '舅父', value: '舅父' },
    { text: '舅母', value: '舅母' },
    { text: '姨母', value: '姨母' },
    { text: '姨父', value: '姨父' }
  ],
  3: [  // 同辈
    { text: '兄', value: '兄' },
    { text: '姐', value: '姐' },
    { text: '弟', value: '弟' },
    { text: '妹', value: '妹' },
    { text: '堂兄', value: '堂兄' },
    { text: '堂姐', value: '堂姐' },
    { text: '堂弟', value: '堂弟' },
    { text: '堂妹', value: '堂妹' },
    { text: '表兄', value: '表兄' },
    { text: '表姐', value: '表姐' },
    { text: '表弟', value: '表弟' },
    { text: '表妹', value: '表妹' },
    { text: '丈夫', value: '丈夫' },
    { text: '妻子', value: '妻子' }
  ],
  4: [  // 晚辈
    { text: '儿子', value: '儿子' },
    { text: '女儿', value: '女儿' },
    { text: '侄子', value: '侄子' },
    { text: '侄女', value: '侄女' },
    { text: '外甥', value: '外甥' },
    { text: '外甥女', value: '外甥女' }
  ],
  5: [  // 孙辈
    { text: '孙子', value: '孙子' },
    { text: '孙女', value: '孙女' },
    { text: '外孙', value: '外孙' },
    { text: '外孙女', value: '外孙女' }
  ]
}

// 常见分支
export const BRANCH_PRESETS = [
  { text: '本家', value: '本家' },
  { text: '外婆家', value: '外婆家' },
  { text: '大爷家', value: '大爷家' },
  { text: '姑家', value: '姑家' },
  { text: '舅家', value: '舅家' },
  { text: '姨家', value: '姨家' },
  { text: '其他亲戚', value: '其他亲戚' },
  { text: '+ 新建分支', value: '__new__' }
]

// 常见显著特征（多选标签，按类别组织）
// 用法：用户多选这些标签，最终拼成逗号分隔字符串存 form.features
export const FEATURE_PRESETS = {
  '发型': ['白发', '光头', '卷发', '短发', '长发', '秃顶'],
  '配饰': ['戴眼镜', '戴耳环', '戴假牙', '戴手表'],
  '体型': ['瘦高', '微胖', '矮小', '壮实', '清瘦'],
  '特征': ['疤痕', '纹身', '胎记', '痣', '酒窝'],
  '行动': ['拄拐杖', '坐轮椅', '行动不便']
}
