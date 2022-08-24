import { gql, useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { LINKS_PER_PAGE } from "../constants";
import Link from './Link'

export const FEED_QUERY = gql`
  query FeedQuery($take: Int, $skip: Int, $orderBy: LinkOrderByInput) {
    feed(take: $take, skip: $skip, orderBy: $orderBy) {
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
    }
  }
`

const NEW_LINKS_SUBSCRIPTION = gql`
  subscription {
    newLink {
      id
      url
      description
      createdAt
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
  }
`

const NEW_VOTES_SUBSCRIPTION = gql`
  subscription {
    newVote {
      id
      link {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      user {
        id
      }
    }
  }
`

function getLinksToRender(isNewPage, data) {
  if (isNewPage) {
    return data.feed.links
  }

  const rankedLinks = data.feed.links.slice()
  rankedLinks.sort((a, b) => b.votes.length - a.votes.length)

  return rankedLinks
}

function getQueryVariables(isNewPage, page) {
  const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
  const take = isNewPage ? LINKS_PER_PAGE : 100
  const orderBy = { createdAt: 'desc' }
  return { take, skip, orderBy }
}

const LinkList = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isNewPage = location.pathname.includes('new')
  const pageIndexParams = location.pathname.split('/')
  const page = parseInt(pageIndexParams[pageIndexParams.length - 1])
  const pageIndex = page ? (page - 1) * LINKS_PER_PAGE : 0

  const {
    data,
    error,
    loading,
    subscribeToMore,
  } = useQuery(FEED_QUERY, {
    variables: getQueryVariables(isNewPage, page)
  })

  subscribeToMore({
    document: NEW_LINKS_SUBSCRIPTION,
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData.data) return prev

      const newLink = subscriptionData.data.newLink

      const exists = prev.feed.links.find(
        ({ id }) => id === newLink.id
      )

      if (exists) return prev

      return Object.assign({}, prev, {
        feed: {
          links: [newLink, ...prev.feed.links],
          count: prev.feed.links.length + 1,
          __typename: prev.feed.__typename
        }
      })
    }
  })

  subscribeToMore({
    document: NEW_VOTES_SUBSCRIPTION
  })

  return (
    <>
      {loading && <p>loading...</p>}

      {error && <pre>{JSON.stringify(error, null, 2)}</pre>}

      {data && (
        <>
          {getLinksToRender(isNewPage, data).map((link, index) => (
            <Link
              key={link.id}
              link={link}
              index={index + pageIndex}
            />
          ))}

          {isNewPage && (
            <div className="flex ml4 mv3 gray">
              <div
                className="pointer mr2"
                onClick={() => {
                  if (page > 1) {
                    navigate(`/new/${page - 1}`)
                  }
                }}
              >
                Previous
              </div>

              <div
                className="pointer"
                onClick={() => {
                  if (page <= data.feed.count / LINKS_PER_PAGE) {
                    const nextPage = page + 1
                    navigate(`/new/${nextPage}`)
                  }
                }}
              >
                Next
              </div>
            </div>
          )}
        </>
      )}

      <div>
        {data && (
          data.feed.links.map((link, index) => (
            <Link key={link.id} link={link} index={index} />
          ))
        )}
      </div>
    </>
  )
}

export default LinkList
