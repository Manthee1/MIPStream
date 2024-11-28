<template>
  <div class="content-wrapper">
    <div class="content-container">
      <h1>Projects</h1>
      <MButton filled icon="plus" @click="$viewStore.createProject()">Create Project</MButton>
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
            <td>{{ project.createdAt }}</td>
            <td>{{ project.createdAt }}</td>
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
