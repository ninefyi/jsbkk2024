<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <img :src="poster" alt="Movie Poster" class="poster-img" /><br/>
    <p><b>Poster</b>: {{ poster }}</p>
    <p><b>Plot</b>: {{ plot }}</p>
    <hr />
    <p><b>Year</b>: {{ year }}</p>
    <hr/>
    <p><b>Score</b>: {{ score }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: false
    },
    plot: {
      type: String,
      required: false
    },
    year: {
      type: Number,
      required: false
    },
    poster: {
      type: String,
      required: false
    },
    score: {
      type: Number,
      required: false
    }
  }
};
</script>

<style scoped>
.card {
  border: 1px solid #cccccc;
  padding: 10px;
  margin-bottom: 10px;
  color:black
}
b {
  text-decoration: underline;
}
img {
  max-width: 300px;
  max-height: 200px;
}

</style>