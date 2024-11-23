<template>
<div class="content-wrapper">
    <div class="content-container">
        <h1>Projects</h1>
        <MButton filled icon="plus" @click="createProject">Create Project</MButton>
        <table class="projects-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Created At</th>
                    <th>Last Saved</th>
                    <th>Size</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="project in projects" :key="project.id">
                    <td>
                        <router-link :to="{ name: 'Workspace', params: { id: project.id } }">{{ project.name }}</router-link>
                    </td>
                    <td>{{ project.createdAt }}</td>
                    <td>{{ project.lastSaved }}</td>
                    <td>{{ project.size }}</td>
                    <td class="flex">
                        <MButton filled class="delete-button" @click="deleteProject(project.id)" icon="trash" />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
  
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MButton from '../components/common/MButton.vue';
interface Project {
  id: number;
  name: string;
  createdAt: string;
  lastSaved: string;
  size: string;
}

export default defineComponent({
  name: 'Projects',
    components: {
        MButton
    },
    data() {
    return {
      projects: [
        {
          id: 1,
          name: 'Project 1',
          createdAt: '2021-01-01',
          lastSaved: '2021-01-01',
          size: '1.2MB',
        },
        {
          id: 2,
          name: 'Project 2',
          createdAt: '2021-01-01',
          lastSaved: '2021-01-01',
          size: '1.2MB',
        },
      ] as Project[],
    };
  },
  methods: {
    createProject() {
      console.log('Create Project');
    },
    editProject(id: number) {
      console.log('Edit Project', id);
    },
    deleteProject(id: number) {
      console.log('Delete Project', id);
    },
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
        padding: 20px
        max-width: 800px
        width: 100%
        margin: 0 auto
        margin-top: 10vh
        .projects-table
            width: 100%
            margin-top: 20px

</style>
