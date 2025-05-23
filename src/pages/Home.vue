<template>
  <div class="content-wrapper">
    <div class="content-container">
      <h1 class="projects-title">Projects</h1>
      <MButton filled accent class="instruction-config-button" icon="server"
        @click="$router.push({ name: 'InstructionsConfig' })">
        <span class="button-text">Instruction Config</span>
      </MButton>
      <div class="flex mb-3">
        <MButton class="my-auto" filled accent icon="plus" @click="setupProject()">Create Project</MButton>
        <input v-model="search" type="text" placeholder="Search projects..." class="mt input-small" />
      </div>
      <table class="projects-table">
        <thead>
          <tr>
            <th>Name</th>
            <!-- <th>Created At</th> -->
            <th>Last Modified</th>
            <th>Size</th>
            <th width="50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="projects.length === 0">
            <td colspan=5>
              <p class="text-center mt-3">No projects found</p>
            </td>
          </tr>
          <tr v-for="project in projects" :key="project.id">
            <td>
              <router-link :to="{ name: 'Workspace', params: { id: project.id } }">{{ project.name
              }}</router-link>
            </td>
            <!-- <td>{{ formatDateRecent(new Date(project.createdAt)) }}</td> -->
            <td>{{ formatDateRecent(new Date(project.savedAt)) }}</td>
            <td>{{ formatSize(project.size) }}</td>
            <td>
              <Dropdown :icon="'more-vertical'" :label="''" :items="[
                { label: 'Rename', action: () => renameProject(project.id), type: 'item', icon: 'edit' },
                { label: 'Delete', action: () => deleteProject(project.id), type: 'item', icon: 'trash' },
              ]">
              </Dropdown>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination -->

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { formatDateRecent, formatSize } from '../assets/js/utils';
import MButton from '../components/common/MButton.vue';
import { Project, getProjects } from '../services/projectsService';
import Dropdown from '../components/common/Dropdown.vue';

export default defineComponent({
  name: 'Projects',
  components: {
    MButton,
    Dropdown
  },
  data() {
    return {
      projects: [] as Project[],
      search: '',
    };
  },
  async mounted() {
    this.updateProjects();
  },

  watch: {
    search: {
      handler(newValue) {
        this.updateProjects();

      },
    },
  },

  methods: {

    async deleteProject(id: number) {

      const success = await this.$projectStore.invokeProjectDeletion(id);
      if (!success) return;
      this.updateProjects();
    },

    async setupProject() {
      const project = await this.$projectStore.invokeProjectSetup();
      if (!project) return;
      this.$router.push({ name: 'Workspace', params: { id: project.id } });
    },

    async renameProject(id: number) {
      const success = await this.$projectStore.invokeProjectRename(id);
      if (!success) return;
      console.log(await getProjects());
      this.updateProjects();

    },

    async updateProjects() {
      this.projects = await getProjects(10, { by: 'savedAt', type: 'desc', }, {
        name: { like: '%' + this.search + '%' },
      });

    },

    formatDateRecent,
    formatSize

  },
});

</script>

<style lang="sass" scoped>
.content-wrapper
  display: flex
  background-color: var(--color-surface-1)
  width: 100%
  min-height: 100%
  padding: 5rem 0px


  .content-container
    padding: 3rem
    max-width: 800px
    width: 100%
    margin: auto
    // margin-top: 18vh
    background-color: var(--color-surface-0)
    border-radius: 10px
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1)
    .projects-title
      font-size: 3rem
      border-bottom: 1px solid var(--color-surface-2)
      padding: 0.5rem 0rem
      

    .projects-table
      width: 100%

.instruction-config-button
  position: absolute
  top: 7rem
  left: 100%;
  transition: translate 0.3s ease
  translate: -4.75rem 0 
  width: max-content
  &:hover
    translate: -99% 0
</style>
