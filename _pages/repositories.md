---
layout: page
permalink: /repositories/
title: repositories
description: Some of the repositories I have worked on.
nav: true
nav_order: 4
---

{% if site.data.repositories.github_users %}

## GitHub users

<div class="repositories repositories-stats d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center" data-fallback-target="github-users-fallback">
  {% for user in site.data.repositories.github_users %}
    {% include repository/repo_user.liquid username=user %}
  {% endfor %}
</div>

<div id="github-users-fallback" class="repositories repositories-fallback d-none flex-wrap flex-md-row flex-column justify-content-start align-items-stretch">
  {% for user in site.data.repositories.github_users %}
  <div class="repo p-2 text-center">
    <a class="card hoverable p-3 h-100 text-decoration-none" href="https://github.com/{{ user }}" rel="external nofollow noopener" target="_blank">
      <h3 class="card-title h5 mb-2 text-break">{{ user }}</h3>
      <p class="card-text mb-0">View GitHub profile</p>
    </a>
  </div>
  {% endfor %}
</div>

---

{% if site.repo_trophies.enabled %}
{% for user in site.data.repositories.github_users %}
{% if site.data.repositories.github_users.size > 1 %}

  <h4>{{ user }}</h4>
  {% endif %}
  <div class="repositories repositories-stats d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% include repository/repo_trophies.liquid username=user %}
  </div>

---

{% endfor %}
{% endif %}
{% endif %}

{% if site.data.repositories.github_repos %}

## GitHub Repositories

<div class="repositories repositories-stats d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center" data-fallback-target="github-repos-fallback">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>

<div id="github-repos-fallback" class="repositories repositories-fallback d-none flex-wrap flex-md-row flex-column justify-content-start align-items-stretch">
  {% for repo in site.data.repositories.github_repos %}
  {% assign repo_parts = repo | split: "/" %}
  {% assign repo_owner = repo_parts[0] %}
  {% assign repo_name = repo_parts[1] %}
  <div class="repo p-2 text-center">
    <a class="card hoverable p-3 h-100 text-decoration-none" href="https://github.com/{{ repo }}" rel="external nofollow noopener" target="_blank">
      <h3 class="card-title h5 mb-2 text-break">{{ repo_name | replace: "-", " " | replace: "_", " " }}</h3>
      <p class="card-text mb-1 text-break">{{ repo_owner }}/{{ repo_name }}</p>
      <p class="card-text mb-0">View repository</p>
    </a>
  </div>
  {% endfor %}
</div>
{% endif %}

<script>
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".repositories-stats").forEach(function (statsContainer) {
      var fallbackTarget = statsContainer.getAttribute("data-fallback-target");
      if (!fallbackTarget) return;

      var fallback = document.getElementById(fallbackTarget);
      if (!fallback) return;

      var images = Array.from(statsContainer.querySelectorAll("img"));
      if (images.length === 0) return;

      function updateFallback() {
        var anyStatsVisible = images.some(function (image) {
          var repo = image.closest(".repo");
          return repo && repo.style.display !== "none" && image.complete && image.naturalWidth > 0;
        });

        fallback.classList.toggle("d-none", anyStatsVisible);
        fallback.classList.toggle("d-flex", !anyStatsVisible);
      }

      images.forEach(function (image) {
        image.addEventListener("load", updateFallback);
        image.addEventListener("error", function () {
          window.setTimeout(updateFallback, 0);
        });
      });

      window.setTimeout(updateFallback, 1500);
    });
  });
</script>
