import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

let currentPage = 1; //current page number

const printPaginationItem = (numOfPages, searchValue) => {
  let paginationLinkItems = [];
  let currentPageCopy = currentPage;

  paginationLinkItems.push(
    <>
      <PaginationItem>
        {currentPageCopy > 1 &&
          (currentPageCopy - 1 === 1 ? (
            <PaginationPrevious href={`/search/${searchValue}`} />
          ) : (
            <PaginationPrevious
              href={`/search/${searchValue}/${currentPageCopy - 1}`}
            />
          ))}
      </PaginationItem>
      <PaginationItem>
        <PaginationLink href={`/search/${searchValue}`}>1</PaginationLink>
      </PaginationItem>
    </>
  );
  for (var i = 2; i < numOfPages; i++) {
    paginationLinkItems.push(
      <PaginationItem>
        <PaginationLink href={`/search/${searchValue}/${i}`}>
          {i}
        </PaginationLink>
      </PaginationItem>
    );

    currentPageCopy = i;
  }

  let nextPage = parseInt(currentPage) + 1;
  // console.log("Next Page = ", nextPage);
  // console.log("Current Page = ", currentPage);
  // console.log("Number Of Pages = ", numOfPages);

  paginationLinkItems.push(
    <>
      <PaginationItem>
        <PaginationEllipsis />
      </PaginationItem>
      <PaginationItem>
        {(currentPage < numOfPages) && (
          <PaginationNext href={`/search/${searchValue}/${nextPage}`} />
        )}
      </PaginationItem>
    </>
  );
  return paginationLinkItems;
};

const BottomPagination = ({ data, perPage, searchValue, pagenumber }) => {
  let numOfPages = Math.floor(data.length / perPage);
  currentPage = pagenumber;
  numOfPages = numOfPages + (data.length % perPage > 0 ? 1 : 0);
  return (
    <Pagination>
      <PaginationContent>
        {data.length > perPage && currentPage <= numOfPages && (
          <>
            {printPaginationItem(numOfPages, searchValue).map(
              (item, index) => item
            )}
          </>
        )}
      </PaginationContent>
    </Pagination>
  );
};

export default BottomPagination;
