<template>
  <div class="content-wrapper">
    <div class="content-container">
      <h1>Projects</h1>
      <MButton accent filled icon="plus" @click="setupProject()">Create Project</MButton>
      <table class="projects-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Created At</th>
            <th>Last Saved</th>
            <th>Size</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projects" :key="project.id">
            <td>
              <router-link :to="{ name: 'Workspace', params: { id: project.id } }">{{ project.name }}</router-link>
            </td>
            <td>{{ formatDateRecent(new Date(project.createdAt)) }}</td>
            <td>{{ formatDateRecent(new Date(project.updatedAt)) }}</td>
            <td>{{ formatSize(project.size) }}</td>
            <td class="flex">
              <MButton type="error" filled class="delete-button" @click="deleteProject(project.id)" icon="trash" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { formatDateRecent, formatSize } from '../assets/js/utils';
import MButton from '../components/common/MButton.vue';
import { Project, loadProjects } from '../storage/projectsStorage';

export default defineComponent({
  name: 'Projects',
  components: {
    MButton
  },
  data() {
    return {
      projects: [] as Project[],
    };
  },
  mounted() {
    this.projects = loadProjects(true);

  },
  methods: {

    async deleteProject(id: string) {

      const success = await this.$viewStore.deleteProject(id);
      if (!success) return;
      this.projects = loadProjects(true);
    },

    async setupProject() {
      const project = await this.$viewStore.setupProject();
      if (!project) return;
      this.$router.push({ name: 'Workspace', params: { id: project.id } });
    },
    formatDateRecent,
    formatSize

  },
});

</script>

<style lang="sass" scoped>
.content-wrapper
  display: flex
  background-color: var(--color-background-dark)
  width: 100%
  height: 100%

  .content-container
    padding: 3rem
    max-width: 800px
    width: 100%
    margin: auto
    margin-top: 18vh
    background-color: var(--color-background)
    border-radius: 10px
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1)

    .projects-table
      width: 100%
      margin-top: 20px
</style>
