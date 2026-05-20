<template>
  <div class="dashboard-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <el-icon class="brand-icon"><UserFilled /></el-icon>
        <h6>柯南名言管理</h6>
        <small>管理后台</small>
      </div>
      <el-menu
        :default-active="currentTab"
        class="sidebar-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="quotes">
          <el-icon><Document /></el-icon>
          <span>名言管理</span>
        </el-menu-item>
        <el-menu-item index="stats">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        <el-menu-item index="admins">
          <el-icon><UserFilled /></el-icon>
          <span>管理员</span>
        </el-menu-item>
        <el-menu-item index="api-docs">
          <el-icon><DocumentChecked /></el-icon>
          <span>API 文档</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <el-button type="danger" text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="main-content">
      <!-- 名言管理 -->
      <div v-show="currentTab === 'quotes'" class="tab-content">
        <!-- 统计卡片 -->
        <el-row :gutter="16" class="mb-4">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="color: #e99312">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-value">{{ totalQuotes }}</div>
              <div class="stat-label">名言总数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="color: #4facfe">
                <el-icon><Search /></el-icon>
              </div>
              <div class="stat-value">{{ apiStats.totalQueries || 0 }}</div>
              <div class="stat-label">总查询次数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="color: #00c9a7">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="stat-value">{{ apiStats.todayQueries || 0 }}</div>
              <div class="stat-label">今日查询</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="color: #ff6b6b">
                <el-icon><Star /></el-icon>
              </div>
              <div class="stat-value">
                {{ apiStats.topCharacters?.[0]?.name || '-' }}
              </div>
              <div class="stat-label">最热角色</div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 添加表单 -->
        <el-card class="mb-4">
          <template #header>
            <span><el-icon><Plus /></el-icon> 添加新名言</span>
          </template>
          <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="100px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="中文名言" prop="quote">
                  <el-input
                    v-model="addForm.quote"
                    type="textarea"
                    :rows="3"
                    placeholder="输入中文名言..."
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="日文名言">
                  <el-input
                    v-model="addForm.japanese"
                    type="textarea"
                    :rows="3"
                    placeholder="输入日文名言（选填）..."
                  />
                </el-form-item>
              </el-col>
              <el-col :span="10">
                <el-form-item label="角色（中文）" prop="character">
                  <el-input v-model="addForm.character" placeholder="例如：江户川柯南" />
                </el-form-item>
              </el-col>
              <el-col :span="10">
                <el-form-item label="角色（日文）">
                  <el-input v-model="addForm.characterJP" placeholder="例如：江戸川コナン" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item>
                  <el-button type="primary" :loading="loading.add" @click="handleAdd">
                    <el-icon v-if="!loading.add"><Plus /></el-icon>
                    添加
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 批量添加 -->
        <el-card class="mb-4">
          <template #header>
            <span><el-icon><Grid /></el-icon> 批量添加名言</span>
          </template>
          <p class="tip-text">
            每行格式：<code>中文名言|角色中文|日文名言|角色日文</code>（后两列可省略）
          </p>
          <el-input
            v-model="batchText"
            type="textarea"
            :rows="6"
            placeholder="真相只有一个|江户川柯南"
            class="mb-2"
          />
          <el-row :gutter="8" align="middle">
            <el-col :span="16">
              <el-button size="small" @click="autoFormatBatch">
                <el-icon><MagicStick /></el-icon> 自动格式化
              </el-button>
              <el-button size="small" type="warning" @click="replaceBatchNames">
                <el-icon><Lightning /></el-icon> 一键替换名字
              </el-button>
              <el-button size="small" @click="batchText = ''">
                <el-icon><Delete /></el-icon> 清空
              </el-button>
            </el-col>
            <el-col :span="8" style="text-align: right">
              <el-button type="primary" :loading="loading.batch" @click="handleBatchAdd">
                <el-icon v-if="!loading.batch"><Plus /></el-icon>
                批量添加
              </el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- 别名替换 -->
        <el-card class="mb-4">
          <template #header>
            <span><el-icon><RefreshRight /></el-icon> 批量别名转全称</span>
          </template>
          <el-row justify="space-between" align="middle">
            <el-col :span="16">
              <p class="tip-text mb-1">
                将所有现有名言中的角色简称自动替换为全称
              </p>
              <p class="tip-text small">
                中文：柯南、毛利兰、灰原哀、工藤新一...
              </p>
            </el-col>
            <el-col :span="4">
              <el-button type="warning" :loading="loading.replace" @click="handleReplaceNames">
                <el-icon><Lightning /></el-icon> 一键替换
              </el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- 危险区 -->
        <el-card class="mb-4 danger-zone">
          <template #header>
            <span style="color: #e53935"><el-icon><WarnTriangleFilled /></el-icon> 危险操作区</span>
          </template>
          <p class="danger-text">
            <el-icon><WarnTriangleFilled /></el-icon>
            <strong>此操作不可逆！</strong>输入 <code>清空全部</code> 解锁确认按钮。
          </p>
          <el-row :gutter="12" align="middle">
            <el-col :span="8">
              <el-input
                v-model="clearInput"
                placeholder="请输入：清空全部"
                :disabled="clearUnlocked"
              />
            </el-col>
            <el-col :span="6">
              <el-button
                :disabled="clearInput !== '清空全部'"
                @click="clearUnlocked = true"
                style="width: 100%"
              >
                <el-icon><Lock /></el-icon> 解锁
              </el-button>
            </el-col>
            <el-col :span="8" v-if="clearUnlocked">
              <el-button type="danger" @click="handleClearAll" style="width: 100%">
                <el-icon><Delete /></el-icon> 确认清空
              </el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- 名言列表 -->
        <el-card>
          <template #header>
            <span>名言列表（共 {{ totalQuotes }} 条）</span>
          </template>
          <el-table :data="quotes" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="quote" label="中文名言" show-overflow-tooltip />
            <el-table-column prop="japanese" label="日文名言" show-overflow-tooltip />
            <el-table-column prop="character" label="角色" width="120" />
            <el-table-column prop="characterJP" label="角色（日文）" width="140" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="scope">
                <el-button size="small" @click="handleEdit(scope.row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="totalPages > 1"
            class="mt-3"
            background
            layout="prev, pager, next"
            :total="totalQuotes"
            :page-size="pageSize"
            :current-page="currentPage"
            @current-change="handlePageChange"
          />
        </el-card>
      </div>

      <!-- 数据统计 -->
      <div v-show="currentTab === 'stats'" class="tab-content">
        <el-row :gutter="16" class="mb-4">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ apiStats.totalQueries }}</div>
              <div class="stat-label">总查询次数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ apiStats.todayQueries }}</div>
              <div class="stat-label">今日查询</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ totalQuotes }}</div>
              <div class="stat-label">名言总数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ apiStats.queryTypes?.length || 0 }}</div>
              <div class="stat-label">查询类型数</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="mb-4">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span><el-icon><TrendCharts /></el-icon> 近7日查询趋势</span>
              </template>
              <div ref="dailyChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span><el-icon><PieChart /></el-icon> 查询类型分布</span>
              </template>
              <div ref="typeChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span><el-icon><Star /></el-icon> 角色热度 TOP10</span>
              </template>
              <div ref="charChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span><el-icon><Clock /></el-icon> 查询日志</span>
              </template>
              <el-table :data="queryLogs" size="small" stripe height="320">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="query_type" label="类型" width="80" />
                <el-table-column prop="character_filter" label="角色筛选" />
                <el-table-column prop="result_count" label="结果数" width="80" />
                <el-table-column prop="created_at" label="时间" width="160" />
              </el-table>
              <el-pagination
                v-if="logTotal > logPageSize"
                class="mt-2"
                small
                background
                layout="prev, pager, next"
                :total="logTotal"
                :page-size="logPageSize"
                :current-page="logPage"
                @current-change="handleLogPageChange"
              />
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 管理员管理 -->
      <div v-show="currentTab === 'admins'" class="tab-content">
        <el-card>
          <template #header>
            <span><el-icon><UserFilled /></el-icon> 管理员列表（共 {{ admins.length }} 人）</span>
          </template>
          <el-table :data="admins" stripe>
            <el-table-column prop="id" label="ID" width="80">
              <template #default="scope">
                <el-tag type="primary">{{ scope.row.id }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="created_at" label="创建时间" />
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button size="small" type="primary" @click="handleEditAdmin(scope.row)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="handleDeleteAdmin(scope.row)"
                  :disabled="admins.length <= 1"
                >
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- API 文档 -->
      <div v-show="currentTab === 'api-docs'" class="tab-content">
        <el-card>
          <template #header>
            <span><el-icon><DocumentChecked /></el-icon> API 接口文档</span>
          </template>

          <el-tabs>
            <!-- 公开接口 -->
            <el-tab-pane label="公开接口">
              <el-table :data="publicApiDocs" stripe size="small">
                <el-table-column prop="method" label="方法" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.method === 'GET' ? 'success' : 'info'" size="small">
                      {{ scope.row.method }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="path" label="路径" width="200">
                  <template #default="scope">
                    <code class="api-path">{{ scope.row.path }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="desc" label="描述" />
                <el-table-column prop="params" label="参数" width="180" />
              </el-table>
            </el-tab-pane>

            <!-- 管理接口 -->
            <el-tab-pane label="管理接口">
              <el-alert type="warning" :closable="false" class="mb-3">
                管理接口需要登录，登录后在请求头携带 <code>Cookie: connect.sid=xxx</code>
              </el-alert>
              <el-table :data="adminApiDocs" stripe size="small">
                <el-table-column prop="method" label="方法" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.method === 'GET' ? 'success' : scope.row.method === 'POST' ? 'primary' : 'warning'" size="small">
                      {{ scope.row.method }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="path" label="路径" width="220">
                  <template #default="scope">
                    <code class="api-path">{{ scope.row.path }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="desc" label="描述" />
                <el-table-column prop="params" label="参数" width="150" />
              </el-table>
            </el-tab-pane>

            <!-- 调用示例 -->
            <el-tab-pane label="调用示例">
              <el-tabs>
                <el-tab-pane label="随机获取">
                  <el-card shadow="never">
                    <template #header>JavaScript / Axios</template>
                    <pre class="code-block">const res = await fetch('/api/quotes/random');
const data = await res.json();
console.log(data.quote);  // 名言内容
console.log(data.character);  // 角色名</pre>
                  </el-card>
                  <el-card shadow="never" class="mt-3">
                    <template #header>Python / requests</template>
                    <pre class="code-block">import requests
r = requests.get('https://你的域名.com/api/quotes/random')
data = r.json()
print(f"{data['character']}: {data['quote']}")</pre>
                  </el-card>
                </el-tab-pane>
                <el-tab-pane label="搜索角色">
                  <el-card shadow="never">
                    <template #header>JavaScript / Axios</template>
                    <pre class="code-block">// 获取柯南的所有名言
const res = await fetch('/api/quotes?qu=柯南&n=10');
const data = await res.json();
console.log(data.quotes);  // 名言数组</pre>
                  </el-card>
                  <el-card shadow="never" class="mt-3">
                    <template #header>完整参数说明</template>
                    <el-table :data="searchParams" size="small" stripe>
                      <el-table-column prop="param" label="参数" width="100">
                        <template #default="scope">
                          <code>{{ scope.row.param }}</code>
                        </template>
                      </el-table-column>
                      <el-table-column prop="desc" label="说明" />
                      <el-table-column prop="example" label="示例" width="150">
                        <template #default="scope">
                          <code>{{ scope.row.example }}</code>
                        </template>
                      </el-table-column>
                      <el-table-column prop="values" label="可选值" width="180">
                        <template #default="scope">
                          <code>{{ scope.row.values }}</code>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-card>
                  <el-card shadow="never" class="mt-3">
                    <template #header>完整调用示例</template>
                    <pre class="code-block">// 获取 10 条柯南的名言
GET /api/quotes?qu=柯南&n=10&la=c

// 随机获取一条日文名言
GET /api/quotes/random?la=j

// 获取包含"真相"的内容（文本格式）
GET /api/quotes/random?s=真相&type=text</pre>
                  </el-card>
                </el-tab-pane>
                <el-tab-pane label="返回格式">
                  <el-card shadow="never">
                    <template #header>JSON 响应示例</template>
                    <pre class="code-block">{{ JSON.stringify({
  "id": 1,
  "quote": "真相永远只有一个！",
  "japanese": "真実はいつもひとつ！",
  "character": "江户川柯南",
  "characterJP": "江戸川コナン",
  "_signature": { "api": "MuYunApi", "project": "名柯南名言集", "version": "1.0" }
}, null, 2) }}</pre>
                  </el-card>
                  <el-card shadow="never" class="mt-3">
                    <template #header>其他返回格式</template>
                    <el-space wrap>
                      <el-tag>type=text</el-tag>
                      <el-tag>type=html</el-tag>
                      <el-tag>type=js</el-tag>
                      <el-tag>type=json (默认)</el-tag>
                    </el-space>
                    <p class="mt-2 text-muted">通过 URL 参数 <code>?type=格式</code> 指定</p>
                  </el-card>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </main>

    <!-- 编辑名言弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑名言" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="中文名言">
          <el-input v-model="editForm.quote" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="日文名言">
          <el-input v-model="editForm.japanese" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="角色（中文）">
          <el-input v-model="editForm.character" />
        </el-form-item>
        <el-form-item label="角色（日文）">
          <el-input v-model="editForm.characterJP" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading.edit" @click="handleSubmitEdit">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑管理员弹窗 -->
    <el-dialog v-model="adminDialogVisible" title="编辑管理员" width="500px">
      <el-form :model="adminForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="adminForm.username" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="adminForm.password"
            type="password"
            show-password
            placeholder="留空则不修改"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adminDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdmin">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加管理员弹窗 -->
    <el-dialog v-model="addAdminDialogVisible" title="添加管理员" width="500px">
      <el-form :model="addAdminForm" label-width="100px">
        <el-form-item label="用户名" required>
          <el-input v-model="addAdminForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="addAdminForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addAdminDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddAdmin">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import {
  getQuotes, addQuote, updateQuote, deleteQuote,
  batchAddQuotes, clearAllQuotes, replaceNames,
  getStats, getQueryLogs,
  getAdmins, addAdmin, updateAdmin, deleteAdmin
} from '../api'

const router = useRouter()

// 状态
const currentTab = ref('quotes')
const quotes = ref([])
const totalQuotes = ref(0)
const currentPage = ref(1)
const pageSize = 6
const totalPages = ref(1)
const apiStats = ref({})
const queryLogs = ref([])
const logPage = ref(1)
const logPageSize = 10
const logTotal = ref(0)
const admins = ref([])

const loading = reactive({ add: false, batch: false, edit: false, replace: false })

// 表单
const addFormRef = ref(null)
const addForm = reactive({ quote: '', character: '', characterJP: '', japanese: '' })
const addRules = {
  quote: [{ required: true, message: '请输入中文名言', trigger: 'blur' }],
  character: [{ required: true, message: '请输入角色名', trigger: 'blur' }]
}

const editForm = reactive({ id: null, quote: '', character: '', characterJP: '', japanese: '' })
const editDialogVisible = ref(false)

const adminForm = reactive({ id: null, username: '', password: '' })
const adminDialogVisible = ref(false)

const addAdminForm = reactive({ username: '', password: '' })
const addAdminDialogVisible = ref(false)

const batchText = ref('')
const clearInput = ref('')
const clearUnlocked = ref(false)

// 图表
const dailyChartRef = ref(null)
const typeChartRef = ref(null)
const charChartRef = ref(null)
let charts = {}

// 别名映射
const nameMap = {
  '柯南': '江户川柯南', '小兰': '毛利兰', '新一': '工藤新一',
  '步美': '吉田步美', '元太': '小岛元太', '光彦': '圆谷光彦',
  '小五郎': '毛利小五郎', '和叶': '远山和叶', '基德': '怪盗基德',
  'コナン': '江戸川コナン', '蘭': '毛利蘭', '歩美': '吉田歩美',
  '和葉': '遠山和葉', '基徳': '怪盗基徳'
}

// API 文档数据
const publicApiDocs = [
  { method: 'GET', path: '/api/quotes', desc: '获取所有名言，支持分页和筛选', params: 'qu, s, n, type, la' },
  { method: 'GET', path: '/api/quotes/random', desc: '随机获取名言（默认1条，最多20条）', params: 'qu, s, n, type, la' },
  { method: 'GET', path: '/api/quotes/:id', desc: '通过ID获取单条名言详情', params: 'type, la' },
  { method: 'GET', path: '/api/stats', desc: '获取统计数据（总量、查询次数、TOP角色等）', params: '-' },
  { method: 'GET', path: '/api/stats/logs', desc: '获取查询日志（分页）', params: 'page, pageSize' },
]

const adminApiDocs = [
  { method: 'POST', path: '/api/admin/login', desc: '管理员登录（JSON body）', params: '{username, password}' },
  { method: 'GET', path: '/api/admin/quotes', desc: '获取名言列表（后台分页，每页6条）', params: 'page (默认1)' },
  { method: 'POST', path: '/api/admin/quotes', desc: '添加单条名言', params: '{quote, character, characterJP?, japanese?}' },
  { method: 'PUT', path: '/api/admin/quotes/:id', desc: '更新指定ID的名言', params: '{quote, character, characterJP?, japanese?}' },
  { method: 'DELETE', path: '/api/admin/quotes/:id', desc: '删除指定ID的名言', params: '-' },
  { method: 'POST', path: '/api/admin/quotes/batch', desc: '批量添加（格式：每行一条，用|分隔字段）', params: '{batchQuotes: "名言|角色|日文|日文角色"}' },
  { method: 'POST', path: '/api/admin/quotes/clear-all', desc: '清空全部名言（需确认）', params: '{confirm: "清空全部"}' },
  { method: 'POST', path: '/api/admin/quotes/replace-names', desc: '批量替换角色别名（新一→工藤新一等）', params: '-' },
  { method: 'GET', path: '/api/admin/admins', desc: '获取管理员列表', params: '-' },
  { method: 'POST', path: '/api/admin/admins', desc: '添加管理员', params: '{username, password}' },
  { method: 'POST', path: '/api/admin/admins/:id', desc: '更新管理员（密码可选）', params: '{username, password?}' },
  { method: 'POST', path: '/api/admin/admins/:id/delete', desc: '删除管理员（至少保留1人）', params: '-' },
]

const searchParams = [
  { param: 'qu', desc: '角色名搜索（中日文模糊匹配）', example: 'qu=柯南', values: 'string' },
  { param: 's', desc: '名言内容搜索（中日文模糊匹配）', example: 's=真相', values: 'string' },
  { param: 'n', desc: '返回数量（默认全部/max50，随机max20）', example: 'n=10', values: '1-50' },
  { param: 'type', desc: '返回格式：json(默认)/text/html/js', example: 'type=text', values: 'json|text|html|js' },
  { param: 'la', desc: '语言：c(中文)/j(日文)/al(全部)', example: 'la=j', values: 'c|j|al' },
]

// 加载数据
async function loadQuotes() {
  try {
    const data = await getQuotes(currentPage.value)
    quotes.value = data.quotes
    totalQuotes.value = data.total
    totalPages.value = data.totalPages
  } catch (error) {
    ElMessage.error('加载名言失败')
  }
}

async function loadStats() {
  try {
    apiStats.value = await getStats()
  } catch (error) {
    ElMessage.error('加载统计失败')
  }
}

async function loadLogs() {
  try {
    const data = await getQueryLogs(logPage.value, logPageSize)
    queryLogs.value = data.logs || []
    logTotal.value = data.total || 0
  } catch (error) {
    ElMessage.error('加载日志失败')
  }
}

async function loadAdmins() {
  try {
    const data = await getAdmins()
    admins.value = data.admins || []
  } catch (error) {
    console.error('加载管理员失败', error)
  }
}

// 添加名言
async function handleAdd() {
  if (!addFormRef.value) return
  await addFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.add = true
    try {
      await addQuote({ ...addForm })
      ElMessage.success('添加成功')
      addForm.quote = ''
      addForm.character = ''
      addForm.characterJP = ''
      addForm.japanese = ''
      loadQuotes()
      loadStats()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '添加失败')
    } finally {
      loading.add = false
    }
  })
}

// 批量添加
async function handleBatchAdd() {
  if (!batchText.value.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }
  loading.batch = true
  try {
    const res = await batchAddQuotes(batchText.value)
    ElMessage.success(`成功 ${res.successCount} 条${res.dupCount > 0 ? `，跳过重复 ${res.dupCount} 条` : ''}`)
    batchText.value = ''
    loadQuotes()
    loadStats()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '批量添加失败')
  } finally {
    loading.batch = false
  }
}

function autoFormatBatch() {
  if (!batchText.value.trim()) {
    ElMessage.warning('内容为空')
    return
  }
  const lines = batchText.value.split('\n').map(line => {
    line = line.trim()
    if (!line || line.includes('|')) return line
    const parts = line.split(/[\s,，\t]+/).filter(Boolean)
    if (parts.length >= 4) return `${parts[0]}|${parts[1]}|${parts[2]}|${parts[3]}`
    if (parts.length >= 2) return `${parts[0]}|${parts[1]}`
    return line
  })
  batchText.value = lines.filter(l => l).join('\n')
  ElMessage.success('自动格式化完成')
}

function replaceBatchNames() {
  if (!batchText.value.trim()) {
    ElMessage.warning('内容为空')
    return
  }
  const lines = batchText.value.split('\n').map(line => {
    line = line.trim()
    if (!line) return line
    const parts = line.split('|').map(s => s.trim())
    if (parts[1] && nameMap[parts[1]]) parts[1] = nameMap[parts[1]]
    if (parts[3] && nameMap[parts[3]]) parts[3] = nameMap[parts[3]]
    return parts.join('|')
  })
  batchText.value = lines.join('\n')
  ElMessage.success('角色简称替换完成')
}

// 编辑名言
function handleEdit(row) {
  Object.assign(editForm, row)
  editDialogVisible.value = true
}

async function handleSubmitEdit() {
  if (!editForm.quote || !editForm.character) {
    ElMessage.warning('名言和角色不能为空')
    return
  }
  loading.edit = true
  try {
    await updateQuote(editForm.id, { ...editForm })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    loadQuotes()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '更新失败')
  } finally {
    loading.edit = false
  }
}

// 删除名言
async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条名言吗？', '提示', { type: 'warning' })
    await deleteQuote(id)
    ElMessage.success('删除成功')
    loadQuotes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 别名替换
async function handleReplaceNames() {
  try {
    await ElMessageBox.confirm('确定要对所有名言执行别名替换吗？', '提示', { type: 'warning' })
    loading.replace = true
    const res = await replaceNames()
    ElMessage.success(`替换完成，更新 ${res.updatedCount} 条`)
    loadQuotes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '替换失败')
    }
  } finally {
    loading.replace = false
  }
}

// 清空全部
async function handleClearAll() {
  try {
    await ElMessageBox.confirm('确定要清空全部名言吗？此操作不可逆！', '警告', { type: 'error' })
    await clearAllQuotes()
    ElMessage.success('已清空全部名言')
    clearInput.value = ''
    clearUnlocked.value = false
    loadQuotes()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败')
    }
  }
}

// 分页
function handlePageChange(p) {
  currentPage.value = p
  loadQuotes()
}

function handleLogPageChange(p) {
  logPage.value = p
  loadLogs()
}

// 管理员管理
function handleEditAdmin(row) {
  adminForm.id = row.id
  adminForm.username = row.username
  adminForm.password = ''
  adminDialogVisible.value = true
}

async function handleSubmitAdmin() {
  if (!adminForm.username) {
    ElMessage.warning('用户名不能为空')
    return
  }
  try {
    await updateAdmin(adminForm.id, { username: adminForm.username, password: adminForm.password })
    ElMessage.success('更新成功')
    adminDialogVisible.value = false
    loadAdmins()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '更新失败')
  }
}

async function handleDeleteAdmin(row) {
  try {
    await ElMessageBox.confirm(`确定删除管理员「${row.username}」吗？`, '提示', { type: 'warning' })
    await deleteAdmin(row.id)
    ElMessage.success('删除成功')
    loadAdmins()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }
}

function handleAddAdmin() {
  if (!addAdminForm.username || !addAdminForm.password) {
    ElMessage.warning('用户名和密码不能为空')
    return
  }
  addAdmin(addAdminForm).then(() => {
    ElMessage.success('添加成功')
    addAdminDialogVisible.value = false
    addAdminForm.username = ''
    addAdminForm.password = ''
    loadAdmins()
  }).catch(error => {
    ElMessage.error(error.response?.data?.error || '添加失败')
  })
}

// 退出登录
function handleLogout() {
  localStorage.removeItem('isLoggedIn')
  window.location.href = '/admin/logout'
}

// 菜单选择
function handleMenuSelect(index) {
  currentTab.value = index
  if (index === 'quotes') {
    loadQuotes()
    loadStats()
  } else if (index === 'stats') {
    loadStats()
    loadLogs()
    nextTick(() => renderCharts())
  } else if (index === 'admins') {
    loadAdmins()
  }
}

// 渲染图表
function renderCharts() {
  if (!apiStats.value.dailyStats) return

  // 每日趋势
  if (dailyChartRef.value) {
    charts.daily = echarts.init(dailyChartRef.value)
    const dates = apiStats.value.dailyStats.map(d => d.date)
    const counts = apiStats.value.dailyStats.map(d => d.count)
    charts.daily.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#555' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#555' } }, splitLine: { lineStyle: { color: '#252a35' } } },
      series: [{
        data: counts,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#e99312' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(233,147,18,0.3)' },
              { offset: 1, color: 'rgba(233,147,18,0.05)' }
            ]
          }
        }
      }]
    })
  }

  // 查询类型
  if (typeChartRef.value) {
    charts.type = echarts.init(typeChartRef.value)
    charts.type.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: apiStats.value.queryTypes.map(t => ({ name: t.type || '其他', value: t.count })),
        itemStyle: { borderRadius: 6, borderColor: '#181b23', borderWidth: 2 },
        label: { color: '#ccc' }
      }],
      color: ['#e99312', '#4facfe', '#00c9a7', '#ff6b6b', '#a29bfe']
    })
  }

  // 角色热度
  if (charChartRef.value) {
    charts.char = echarts.init(charChartRef.value)
    const chars = apiStats.value.topCharacters || []
    charts.char.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: chars.map(c => c.name), axisLabel: { color: '#aaa', rotate: 30 }, axisLine: { lineStyle: { color: '#555' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#555' } }, splitLine: { lineStyle: { color: '#252a35' } } },
      series: [{ data: chars.map(c => c.count), type: 'bar', itemStyle: { color: '#e99312', borderRadius: [4, 4, 0, 0] } }]
    })
  }
}

onMounted(() => {
  loadQuotes()
  loadStats()
  loadAdmins()
})
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  background: #0f1117;
}

.sidebar {
  width: 220px;
  background: #0d0f14;
  border-right: 1px solid #252a35;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  padding: 24px 20px 16px;
  text-align: center;
  border-bottom: 1px solid #252a35;
}

.brand-icon {
  font-size: 2rem;
  color: #e99312;
  margin-bottom: 8px;
}

.sidebar-brand h6 {
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  margin: 0;
}

.sidebar-brand small {
  color: #8892a0;
  font-size: 0.72rem;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #252a35;
  text-align: center;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stat-card {
  text-align: center;
  background: #181b23 !important;
  border-color: #252a35 !important;
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  color: #8892a0;
  font-size: 0.82rem;
  margin-top: 4px;
}

.chart-container {
  height: 320px;
}

.tip-text {
  color: #8892a0;
  font-size: 0.85rem;
  margin-bottom: 10px;
}

.tip-text code {
  color: #e99312;
  background: rgba(233, 147, 18, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.danger-zone {
  border: 1px solid #e53935 !important;
}

.danger-text {
  color: #e53935;
  font-size: 0.88rem;
  margin-bottom: 16px;
}

.danger-text code {
  background: rgba(229, 57, 53, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

/* API 文档样式 */
.api-path {
  background: rgba(233, 147, 18, 0.12);
  color: #e99312;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
}

.code-block {
  background: #0d0f14;
  border: 1px solid #252a35;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  color: #e0e0e0;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
}

.text-muted {
  color: #8892a0;
  font-size: 0.85rem;
}
</style>
